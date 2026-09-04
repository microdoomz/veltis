import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #10b981, #047857)', // Green gradient for finance
          color: 'white',
          fontSize: 22,
          fontWeight: 800,
          borderRadius: 8,
          fontFamily: 'sans-serif'
        }}
      >
        V
      </div>
    ),
    { ...size }
  )
}
