import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full bg-white border-b border-gray-100">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <img src="/logo.svg" alt="Elevare Logo" className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">Elevare</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Features
            </Link>
            <Link href="#community" className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              Community
            </Link>
            <Link href="#faq" className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              FAQ
            </Link>
            <Link href="/login" className="group relative px-6 py-2 bg-slate-600 text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg">
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Log In
              </span>
              <div className="absolute inset-0 bg-slate-800 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
            <Link href="/register" className="group relative px-6 py-2 bg-primary text-white font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg">
              <span className="relative z-10 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                Sign Up
              </span>
              <div className="absolute inset-0 bg-black transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-0 bg-white relative overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8 animate-fadeIn">
              <div className="inline-block">
                <span className="text-primary text-sm font-semibold tracking-wider uppercase">
                  Academic Excellence Through Collaboration
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                Elevate Your<br />
                Academic Journey
              </h1>
              
              {/* Feature List with Checkmarks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">Task Manager</span>
                </div>
                
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">Note Taking</span>
                </div>
                
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">Resource Sharing</span>
                </div>
                
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">Study Groups</span>
                </div>
                
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">Collaborative Whiteboard</span>
                </div>
                
                <div className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700 font-medium">AI-Summarization</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all transform hover:scale-105 hover:shadow-lg flex items-center gap-2">
                    Get Started
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative">
              <div className="relative animate-float">
                <Image
                  src="/images/DrawKit Vector Illustration-1.png"
                  alt="Student learning"
                  width={700}
                  height={700}
                  className="w-full h-auto drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Slanted Divider - White to Green */}
      <div className="relative h-32 bg-white">
        <div className="absolute inset-0 bg-primary" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Trusted Section */}
      <section id="features" className="bg-primary py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-white space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Trusted By Learners<br />
                Worldwide
              </h2>
              
              <div className="space-y-4">
                <p className="text-lg text-white/90 leading-relaxed">
                  Join students transforming their academic journey with <span className="font-semibold underline decoration-2">powerful collaboration tools</span>
                </p>
                
                <p className="text-white/80 leading-relaxed">
                  Find everything you need to excel academically in one unified platform that assures you find the best resources provided by your peers to take the next step.
                </p>
              </div>
              
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    Elevate Now
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative">
              <div className="relative animate-float" style={{animationDelay: '0.5s'}}>
                <Image
                  src="/images/DrawKit Vector Illustration-2.png"
                  alt="Learners worldwide"
                  width={600}
                  height={600}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Green to Dark */}
      <div className="relative h-32 bg-primary">
        <div className="absolute inset-0 bg-black" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Everything You Need Section */}
      <section className="bg-black py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-white space-y-6">
              <p className="text-primary text-sm font-medium">From personal organization to team collaboration, Elevare provides comprehensive tools for academic success</p>
              
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Everything You Need<br />
                to Excel
              </h2>
              
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    Excel for Free
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Cards Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Card 1 - White */}
              <div className="bg-white rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]">
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  1.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Task Management</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Organize Assignments With Priorities, Deadlines, Categories, And Intelligent Notifications</p>
                </div>
              </div>

              {/* Card 2 - Green */}
              <div className="bg-primary rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.1s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary text-xl font-bold shadow-lg">
                  2.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Rich Note-Taking</h3>
                  <p className="text-sm text-white/90 leading-relaxed">Create Structured Notes With Rich Formatting, Folders, Tags, And Summarization For Quick Reviews</p>
                </div>
              </div>

              {/* Card 3 - Green */}
              <div className="bg-primary rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.2s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary text-xl font-bold shadow-lg">
                  3.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Study Groups</h3>
                  <p className="text-sm text-white/90 leading-relaxed">Create Or Join Study Groups, Chat With Members, Share Resources, And Collaborate In Dedicated Spaces</p>
                </div>
              </div>

              {/* Card 4 - White */}
              <div className="bg-white rounded-3xl p-8 relative group hover:-translate-y-2 transition-all duration-300 hover:shadow-2xl animate-fadeIn min-h-[280px]" style={{animationDelay: '0.3s'}}>
                <div className="absolute -top-3 -left-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  4.
                </div>
                <div className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Video Conferencing</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">Connect Face-To-Face With Screen Sharing, Breakout Rooms, And High-Quality Audio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Dark to Green */}
      <div className="relative h-32 bg-black">
        <div className="absolute inset-0 bg-primary" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Join Community Section */}
      <section id="community" className="bg-primary py-20 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="text-gray-900 space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Join The Elevare<br />
                Community
              </h2>
              
              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3">
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Collaborative Learning
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Knowledge Sharing
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Built for Students by a Student
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Full Control
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Boost Productivity
                </div>
                <div className="group bg-white px-6 py-3 rounded-full font-medium hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary group-hover:text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Trusted by Learners Worldwide
                </div>
              </div>
              
              <div className="pt-4">
                <Link href="/register">
                  <button className="group px-8 py-4 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-2">
                    Sign-up Now
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Right Illustration */}
            <div className="relative">
              <div className="relative animate-float" style={{animationDelay: '0.5s'}}>
                <Image
                  src="/images/DrawKit Vector Illustration-3.png"
                  alt="Join community"
                  width={600}
                  height={600}
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Green to Dark */}
      <div className="relative h-32 bg-primary">
        <div className="absolute inset-0 bg-black" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* FAQ Section */}
      <section id="faq" className="bg-black py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400 text-lg">Everything you need to know about Elevare</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                What is Elevare?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Elevare is a comprehensive collaborative learning platform designed for students. It combines task management, note-taking, study groups, whiteboard collaboration, resource sharing, and video conferencing in one unified platform to help you excel academically.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                Is Elevare really free?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Yes! Elevare is 100% free to use with no hidden costs. You get full access to all features including task management, notes, study groups, whiteboard, resource sharing, and video calls. No credit card required, ever.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                How secure is my data?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Your data security is our top priority. All data is encrypted in transit and at rest. You have complete control over your information, and we never share your data with third parties.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                Can I collaborate with my classmates?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Absolutely! Elevare is built for collaboration. Create or join study groups, share resources, work together on whiteboards in real-time, chat with group members, and host video calls.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                How do I get started?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Getting started is easy! Simply click the "Get Started" button, create your account with your email, and you'll be ready to go in seconds. No setup required – start organizing your studies immediately.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                What if I need help?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                We're here to help! Access our comprehensive documentation, video tutorials, and community forums. You can also reach our support team directly through the help center.
              </p>
            </details>

            <details className="bg-white rounded-2xl p-6 group hover:shadow-xl transition-all">
              <summary className="font-bold text-lg text-gray-900 cursor-pointer flex justify-between items-center">
                Can I use Elevare for any subject?
                <span className="text-primary text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Yes! Elevare is designed to work for any subject or field of study. Whether you're studying computer science, medicine, business, arts, or anything else, our flexible tools adapt to your needs.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Slanted Divider - Dark to White */}
      <div className="relative h-32 bg-black">
        <div className="absolute inset-0 bg-white" style={{clipPath: 'polygon(0 0, 100% 100%, 100% 100%, 0 100%)'}}></div>
      </div>

      {/* Footer */}
      <footer className="bg-white text-black py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <img src="/logo.svg" alt="Elevare Logo" className="h-6 w-6" />
                </div>
                <span className="text-2xl font-bold">Elevare</span>
              </div>
              <p className="text-gray-400 text-sm">
                Elevate your learning journey with comprehensive collaboration tools.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Get Started</Link></li>
                <li><Link href="#faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#community" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Blog</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/register" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Terms and Conditions</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              Copyright © 2025 Elevare. Built for collaborative learning.
            </p>
            <div className="flex gap-4">
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </Link>
              <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
