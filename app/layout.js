import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'SportVision AI Pro',
  description: 'Enterprise multi-sport video performance analytics powered by Gemini multimodal AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-[#07080B]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
