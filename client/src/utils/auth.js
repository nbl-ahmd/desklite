// utils/auth.js
import { getSession } from 'next-auth/react';

export const getApiToken = async () => {
  const session = await getSession();
  const token = session?.apiToken;

  if (!token) {
    throw new Error('No access token found. Please log in again.');
  }

  return token;
};
