import { auth } from "@/lib/firebase/client";

export async function authenticatedFetch(input: string, init?: RequestInit) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in");
  }

  const token = await currentUser.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
