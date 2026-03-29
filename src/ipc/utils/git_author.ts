import { getGithubUser } from "../handlers/github_handlers";

export async function getGitAuthor() {
  const user = await getGithubUser();
  const author = user
    ? {
        name: "[chaemera]",
        email: user.email,
      }
    : {
        name: "[chaemera]",
        email: "git@chaemera.local",
      };
  return author;
}
