import { NextResponse } from 'next/server';

export function safeSerialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )
  );
}

export function safeJsonResponse<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(safeSerialize(data), init);
}
