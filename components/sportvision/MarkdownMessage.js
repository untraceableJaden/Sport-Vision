'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownMessage = ({ text }) => {
  return (
    <div className="text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="mb-2 last:mb-0" {...props} />,
          strong: (props) => <strong className="font-semibold text-white" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          ul: (props) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
          li: (props) => <li className="pl-0.5" {...props} />,
          h1: (props) => <h4 className="text-[13px] font-semibold text-white mt-2 mb-1 tracking-tight" {...props} />,
          h2: (props) => <h4 className="text-[13px] font-semibold text-white mt-2 mb-1 tracking-tight" {...props} />,
          h3: (props) => <h4 className="text-[13px] font-semibold text-white mt-2 mb-1 tracking-tight" {...props} />,
          code: ({ inline, ...props }) => (inline
            ? <code className="px-1 py-0.5 rounded bg-black/30 text-blue-300 text-[12px]" {...props} />
            : <code className="block p-2 rounded-lg bg-black/30 text-blue-300 text-[12px] overflow-x-auto my-1" {...props} />),
          pre: (props) => <pre className="my-1" {...props} />,
          a: (props) => <a className="text-blue-400 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />,
          hr: () => <hr className="border-white/10 my-2" />,
          blockquote: (props) => <blockquote className="border-l-2 border-white/20 pl-3 italic text-white/60 my-1" {...props} />,
          table: (props) => <div className="overflow-x-auto my-2"><table className="text-xs border-collapse w-full" {...props} /></div>,
          th: (props) => <th className="border border-white/10 px-2 py-1 bg-white/[0.05] text-left" {...props} />,
          td: (props) => <td className="border border-white/10 px-2 py-1" {...props} />,
        }}
      >
        {text || ''}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownMessage
