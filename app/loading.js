const Loading = () => {
  return (
    <div className="min-h-screen bg-[#07080B] flex items-center justify-center">
      <div className="sv-ambient" />
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-white/[0.08]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
      </div>
    </div>
  )
}

export default Loading
