import { getSession } from 'next-auth/react';

export async function fetchApi(
  endpoint: string,
  options: RequestInit = {}
) {
  const session = await getSession();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(session && { Authorization: `Bearer ${session.user.id}` }),
      ...options.headers,
    },
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      ...defaultOptions,
      ...options,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Something went wrong');
  }

  return response.json();
} 