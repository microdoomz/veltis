import { db } from '../src/lib/db';
import { user } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { auth } from '../src/lib/auth/auth'; // Ensure this exports the auth server instance

// We will just run a curl or fetch against the local running API if the dev server is up
async function seedMockUser() {
  const res = await fetch('http://127.0.0.1:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://127.0.0.1:3000',
    },
    body: JSON.stringify({
      email: 'mock@example.com',
      password: 'Password123!',
      name: 'Mock User',
    })
  });

  if (res.ok) {
    console.log('Mock user created successfully');
  } else {
    const error = await res.text();
    console.error('Failed to create mock user:', error);
  }
}

seedMockUser();
