use crate::core_domains::{read_settings, write_settings};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Mutex,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use sysinfo::{get_current_pid, ProcessesToUpdate, System, MINIMUM_CPU_UPDATE_INTERVAL};
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, Webview};

const FORCE_CLOSE_EVENT_CHANNEL: &str = "force-close-detected";
const FORCE_CLOSE_EMIT_DELAY_MS: u64 = 5_000;
const DEFAULT_PERFORMANCE_MONITOR_INTERVAL_MS: u64 = 30_000;
const TEST_PERFORMANCE_MONITOR_INTERVAL_MS: u64 = 1_000;
const BYTES_PER_MB: f64 = 1024.0 * 1024.0;

pub struct RuntimeLifecycleState {
    pending_force_close: Mutex<Option<Value>>,
    performance_monitor: PerformanceMonitor,
}

struct PerformanceMonitor {
    stop_tx: Mutex<Option<mpsc::Sender<()>>>,
    join_handle: Mutex<Option<JoinHandle<()>>>,
    stopped: AtomicBool,
}

#[derive(Debug, Serialize)]
struct PerformanceSnapshot {
    timestamp: u64,
    #[serde(rename = "memoryUsageMB")]
    memory_usage_mb: u64,
    #[serde(rename = "cpuUsagePercent")]
    cpu_usage_percent: f64,
    #[serde(rename = "systemMemoryUsageMB")]
    system_memory_usage_mb: u64,
    #[serde(rename = "systemMemoryTotalMB")]
    system_memory_total_mb: u64,
    #[serde(rename = "systemCpuPercent")]
    system_cpu_percent: f64,
}

struct PerformanceSampler {
    pid: sysinfo::Pid,
    system: System,
}

impl PerformanceMonitor {
    fn start<R: Runtime>(app: AppHandle<R>) -> Self {
        let (stop_tx, stop_rx) = mpsc::channel();
        let join_handle = thread::spawn(move || run_performance_monitor(app, stop_rx));

        Self {
            stop_tx: Mutex::new(Some(stop_tx)),
            join_handle: Mutex::new(Some(join_handle)),
            stopped: AtomicBool::new(false),
        }
    }

    fn stop(&self) -> Result<(), String> {
        if self.stopped.swap(true, Ordering::SeqCst) {
            return Ok(());
        }

        let stop_tx = self
            .stop_tx
            .lock()
            .map_err(|_| "performance monitor stop channel lock poisoned".to_string())?
            .take();
        if let Some(stop_tx) = stop_tx {
            let _ = stop_tx.send(());
        }

        let join_handle = self
            .join_handle
            .lock()
            .map_err(|_| "performance monitor join handle lock poisoned".to_string())?
            .take();
        if let Some(join_handle) = join_handle {
            join_handle
                .join()
                .map_err(|_| "performance monitor thread panicked".to_string())?;
        }

        Ok(())
    }
}

impl PerformanceSampler {
    fn new() -> Result<Self, String> {
        Ok(Self {
            pid: get_current_pid()
                .map_err(|error| format!("failed to get current pid: {error}"))?,
            system: System::new(),
        })
    }

    fn prime(&mut self) {
        self.system.refresh_memory();
        self.system
            .refresh_processes(ProcessesToUpdate::Some(&[self.pid]), true);
        self.system.refresh_cpu_usage();
        thread::sleep(MINIMUM_CPU_UPDATE_INTERVAL);
    }

    fn capture_and_persist<R: Runtime>(&mut self, app: &AppHandle<R>) -> Result<(), String> {
        self.system.refresh_memory();
        self.system.refresh_cpu_usage();
        self.system
            .refresh_processes(ProcessesToUpdate::Some(&[self.pid]), true);

        let process = self
            .system
            .process(self.pid)
            .ok_or_else(|| format!("current process {} not found in sysinfo snapshot", self.pid))?;

        let snapshot = PerformanceSnapshot {
            timestamp: now_millis(),
            memory_usage_mb: bytes_to_mb(process.memory()),
            cpu_usage_percent: round_metric(process.cpu_usage()),
            system_memory_usage_mb: bytes_to_mb(self.system.used_memory()),
            system_memory_total_mb: bytes_to_mb(self.system.total_memory()),
            system_cpu_percent: round_metric(self.system.global_cpu_usage()),
        };

        write_settings(app, json!({ "lastKnownPerformance": snapshot }))?;
        Ok(())
    }
}

pub fn initialize<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let settings = read_settings(app)?;
    let pending_force_close = if settings
        .get("isRunning")
        .and_then(Value::as_bool)
        .unwrap_or(false)
    {
        settings.get("lastKnownPerformance").cloned()
    } else {
        None
    };

    write_settings(app, startup_settings_patch())?;

    let state = RuntimeLifecycleState {
        pending_force_close: Mutex::new(pending_force_close),
        performance_monitor: PerformanceMonitor::start(app.clone()),
    };
    app.manage(state);

    Ok(())
}

pub fn emit_pending_force_close<R: Runtime>(webview: &Webview<R>) {
    if webview.label() != "main" {
        return;
    }

    let app_handle = webview.app_handle().clone();
    let webview_label = webview.label().to_string();
    let state = app_handle.state::<RuntimeLifecycleState>();
    let pending_force_close = match state.pending_force_close.lock() {
        Ok(mut pending) => pending.take(),
        Err(_) => {
            eprintln!("runtime lifecycle pending force-close state lock poisoned");
            None
        }
    };

    if let Some(performance_data) = pending_force_close {
        thread::spawn(move || {
            thread::sleep(Duration::from_millis(FORCE_CLOSE_EMIT_DELAY_MS));
            let _ = app_handle.emit_to(
                webview_label,
                FORCE_CLOSE_EVENT_CHANNEL,
                json!({ "performanceData": performance_data }),
            );
        });
    }
}

pub fn handle_run_event<R: Runtime>(app: &AppHandle<R>, event: &RunEvent) -> Result<(), String> {
    if matches!(event, RunEvent::Exit) {
        let state = app.state::<RuntimeLifecycleState>();
        state.performance_monitor.stop()?;
        write_settings(app, json!({ "isRunning": false }))?;
    }

    Ok(())
}

fn run_performance_monitor<R: Runtime>(app: AppHandle<R>, stop_rx: mpsc::Receiver<()>) {
    let mut sampler = match PerformanceSampler::new() {
        Ok(sampler) => sampler,
        Err(error) => {
            eprintln!("failed to initialize performance sampler: {error}");
            return;
        }
    };

    sampler.prime();
    if let Err(error) = sampler.capture_and_persist(&app) {
        eprintln!("failed to persist initial performance snapshot: {error}");
    }

    let interval = performance_monitor_interval();

    loop {
        match stop_rx.recv_timeout(interval) {
            Ok(()) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                if let Err(error) = sampler.capture_and_persist(&app) {
                    eprintln!("failed to persist final performance snapshot: {error}");
                }
                return;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if let Err(error) = sampler.capture_and_persist(&app) {
                    eprintln!("failed to persist periodic performance snapshot: {error}");
                }
            }
        }
    }
}

fn startup_settings_patch() -> Value {
    if is_test_build() {
        json!({
            "isRunning": true,
            "isTestMode": true,
        })
    } else {
        json!({ "isRunning": true })
    }
}

fn performance_monitor_interval() -> Duration {
    if let Some(interval_ms) = std::env::var("CHAEMERA_PERFORMANCE_MONITOR_INTERVAL_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|value| *value > 0)
    {
        return Duration::from_millis(
            interval_ms.max(MINIMUM_CPU_UPDATE_INTERVAL.as_millis() as u64),
        );
    }

    if is_test_build() {
        return Duration::from_millis(TEST_PERFORMANCE_MONITOR_INTERVAL_MS);
    }

    Duration::from_millis(DEFAULT_PERFORMANCE_MONITOR_INTERVAL_MS)
}

fn is_test_build() -> bool {
    std::env::var("E2E_TEST_BUILD").is_ok_and(|value| value == "true")
}

fn bytes_to_mb(bytes: u64) -> u64 {
    (bytes as f64 / BYTES_PER_MB).round() as u64
}

fn round_metric(value: f32) -> f64 {
    ((value as f64) * 100.0).round() / 100.0
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
