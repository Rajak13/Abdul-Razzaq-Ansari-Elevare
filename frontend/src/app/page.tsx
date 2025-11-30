import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
            <img
              src="/logo.svg"
              alt="Elevare Logo"
              className="h-10 w-10"
            />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">
              Elevare
            </span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#why-elevare"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Why Elevare
            </Link>
            <Link
              href="#faq"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-2 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/10 pt-20">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 blur-3xl delay-1000"></div>
          <div className="absolute top-1/4 left-1/4 h-32 w-32 animate-bounce rounded-full bg-gradient-to-br from-accent/10 to-primary/10 blur-2xl delay-500"></div>
        </div>

        <div className="container relative mx-auto px-4 py-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-card/80 px-6 py-3 text-sm font-medium text-primary backdrop-blur-sm shadow-sm">
                  <span className="mr-2 animate-bounce">🎓</span>
                  Academic Excellence Through Collaboration
                </div>

                <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
                  Elevate Your{' '}
                  <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    Academic Journey
                  </span>
                </h1>

                <p className="text-xl leading-relaxed text-muted-foreground md:text-2xl max-w-2xl">
                  Master your studies with Elevare's comprehensive platform. Organize tasks, collaborate in real-time, share resources, and achieve excellence with tools built for modern learners.
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-3 gap-4 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm shadow-lg">
                <div className="text-center">
                  <div className="text-3xl mb-2">✅</div>
                  <div className="text-sm font-medium text-card-foreground">Task Manager</div>
                </div>
                <div className="border-x border-border text-center">
                  <div className="text-3xl mb-2">🎨</div>
                  <div className="text-sm font-medium text-card-foreground">Whiteboard</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">📹</div>
                  <div className="text-sm font-medium text-card-foreground">Video Calls</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
                <Link href="/signup">
                  <button className="group bg-gradient-to-r from-primary via-secondary to-accent px-8 py-4 text-lg font-semibold text-white rounded-lg shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                    <span className="mr-2 transition-transform group-hover:scale-110">🚀</span>
                    Start Free Today
                  </button>
                </Link>
                <Link href="#features">
                  <button className="group border-2 border-primary px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 hover:bg-primary/5">
                    <span className="mr-2 transition-transform group-hover:scale-110">📖</span>
                    Explore Features
                  </button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground lg:justify-start">
                <div className="group flex items-center gap-2">
                  <span className="text-green-500 transition-transform group-hover:scale-110">✓</span>
                  100% Free
                </div>
                <div className="group flex items-center gap-2">
                  <span className="text-green-500 transition-transform group-hover:scale-110">✓</span>
                  No Credit Card
                </div>
                <div className="group flex items-center gap-2">
                  <span className="text-green-500 transition-transform group-hover:scale-110">✓</span>
                  Full Control
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative">
              {/* Main dashboard mockup */}
              <div className="relative rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 p-6 backdrop-blur-sm shadow-2xl">
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-background shadow-inner">
                  {/* Dashboard header */}
                  <div className="flex items-center justify-between border-b border-border/50 bg-card/50 px-6 py-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src="/logo.svg"
                        alt="Elevare Logo"
                        className="h-7 w-7"
                      />
                      <span className="font-semibold text-foreground">Dashboard</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500/80 shadow-sm"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80 shadow-sm"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500/80 shadow-sm"></div>
                    </div>
                  </div>

                  {/* Dashboard content */}
                  <div className="p-6 space-y-5">
                    {/* Stats cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="group rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-center shadow-sm transition-all hover:shadow-md hover:scale-105">
                        <div className="text-2xl font-bold text-primary">24</div>
                        <div className="text-xs font-medium text-primary/70">Tasks</div>
                      </div>
                      <div className="group rounded-xl border border-secondary/20 bg-gradient-to-br from-secondary/10 to-secondary/5 p-4 text-center shadow-sm transition-all hover:shadow-md hover:scale-105">
                        <div className="text-2xl font-bold text-secondary">15</div>
                        <div className="text-xs font-medium text-secondary/70">Notes</div>
                      </div>
                      <div className="group rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 to-accent/5 p-4 text-center shadow-sm transition-all hover:shadow-md hover:scale-105">
                        <div className="text-2xl font-bold text-accent">5</div>
                        <div className="text-xs font-medium text-accent/70">Groups</div>
                      </div>
                    </div>

                    {/* Task list mockup */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                        <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary/20"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-foreground/20 to-foreground/5"></div>
                          <div className="h-1.5 w-1/2 rounded-full bg-foreground/10"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                        <div className="h-4 w-4 rounded-full border-2 border-secondary bg-secondary/20"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 w-2/3 rounded-full bg-gradient-to-r from-foreground/20 to-foreground/5"></div>
                          <div className="h-1.5 w-1/3 rounded-full bg-foreground/10"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md">
                        <div className="h-4 w-4 rounded-full border-2 border-accent bg-accent/20"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-foreground/20 to-foreground/5"></div>
                          <div className="h-1.5 w-2/5 rounded-full bg-foreground/10"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating feature badges */}
                <div className="absolute -right-4 -top-4 animate-bounce rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-3 text-white shadow-xl">
                  <span className="text-xl">📊</span>
                </div>
                <div className="absolute -bottom-4 -left-4 animate-pulse rounded-2xl bg-gradient-to-br from-secondary to-secondary/90 p-3 text-white shadow-xl delay-300">
                  <span className="text-xl">🎯</span>
                </div>
                <div className="absolute -right-6 top-1/2 animate-bounce rounded-2xl bg-gradient-to-br from-accent to-accent/90 p-2.5 text-white shadow-xl delay-700">
                  <span className="text-lg">✨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-gradient-to-r from-primary/5 to-secondary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Trusted by Learners Worldwide</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Join students transforming their academic journey with powerful collaboration tools
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="group text-center">
              <div className="rounded-2xl border border-primary/10 bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110">📝</div>
                <div className="mb-2 text-3xl font-bold text-primary">50K+</div>
                <div className="text-muted-foreground">Notes Created</div>
              </div>
            </div>

            <div className="group text-center">
              <div className="rounded-2xl border border-secondary/10 bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110">✅</div>
                <div className="mb-2 text-3xl font-bold text-secondary">100K+</div>
                <div className="text-muted-foreground">Tasks Completed</div>
              </div>
            </div>

            <div className="group text-center">
              <div className="rounded-2xl border border-accent/10 bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110">👥</div>
                <div className="mb-2 text-3xl font-bold text-accent">1K+</div>
                <div className="text-muted-foreground">Study Groups</div>
              </div>
            </div>

            <div className="group text-center">
              <div className="rounded-2xl border border-primary/10 bg-card p-8 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110">🎓</div>
                <div className="mb-2 text-3xl font-bold text-primary">98%</div>
                <div className="text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-foreground">Everything You Need to Excel</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              From personal organization to team collaboration, Elevare provides comprehensive tools for academic success
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-primary/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">📋</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                  Smart Task Management
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Organize assignments with priorities, deadlines, categories, and intelligent notifications. Calendar and list views included.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-primary">Learn more →</span>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-secondary/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-secondary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">📝</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-secondary">
                  Rich Note-Taking
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Create structured notes with rich formatting, folders, tags, and AI-powered summarization for quick reviews.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-secondary">Learn more →</span>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-accent/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">👥</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-accent">
                  Study Groups
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Create or join study groups, chat with members, share resources, and collaborate in dedicated spaces.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-accent">Learn more →</span>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-primary/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">🎨</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                  Collaborative Whiteboard
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Draw, diagram, and brainstorm together in real-time with version history and export capabilities.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-primary">Learn more →</span>
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-secondary/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-secondary/20">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">📚</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-secondary">
                  Resource Sharing
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Upload, discover, and share study materials with ratings, comments, and community engagement.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-secondary">Learn more →</span>
                </div>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card to-accent/5 p-6 text-center transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-accent/20">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 transition-all duration-500 group-hover:rotate-6 group-hover:scale-125">
                  <span className="text-3xl transition-transform group-hover:scale-110">📹</span>
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground transition-colors group-hover:text-accent">
                  Video Conferencing
                </h3>
                <p className="text-muted-foreground transition-colors group-hover:text-foreground/80">
                  Connect face-to-face with screen sharing, breakout rooms, and high-quality audio for remote collaboration.
                </p>
                <div className="mt-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-sm font-medium text-accent">Learn more →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Elevare Section */}
      <section id="why-elevare" className="bg-gradient-to-br from-background to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Why Choose Elevare?</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Discover what makes Elevare the perfect companion for your academic journey
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="group text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 transition-transform group-hover:scale-110">
                <span className="text-2xl text-white">🎯</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary">
                Full Control
              </h3>
              <p className="text-sm text-muted-foreground">
                Your data, your platform. Complete control over your academic workspace.
              </p>
            </div>

            <div className="group text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 transition-transform group-hover:scale-110">
                <span className="text-2xl text-white">🚀</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-secondary">
                Boost Productivity
              </h3>
              <p className="text-sm text-muted-foreground">
                Smart features and automation to help you stay on top of your game.
              </p>
            </div>

            <div className="group text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 transition-transform group-hover:scale-110">
                <span className="text-2xl text-white">🤝</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-accent">
                Real Collaboration
              </h3>
              <p className="text-sm text-muted-foreground">
                Work together in real-time with powerful collaboration tools.
              </p>
            </div>

            <div className="group text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary transition-transform group-hover:scale-110">
                <span className="text-2xl text-white">🌍</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary">
                Built for Students
              </h3>
              <p className="text-sm text-muted-foreground">
                Designed with deep understanding of modern learning requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Join the Elevare Community</h2>
            <p className="text-xl text-muted-foreground">
              Connect with learners, share knowledge, and grow together
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 text-4xl">🤝</div>
              <h3 className="mb-4 text-xl font-semibold">Collaborative Learning</h3>
              <p className="text-muted-foreground">
                Work together in study groups, share resources, and learn from each other's experiences.
              </p>
            </div>

            <div className="group rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 text-4xl">📚</div>
              <h3 className="mb-4 text-xl font-semibold">Knowledge Sharing</h3>
              <p className="text-muted-foreground">
                Access a vast library of shared study materials and resources from the community.
              </p>
            </div>

            <div className="group rounded-2xl border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 text-4xl">🎯</div>
              <h3 className="mb-4 text-xl font-semibold">Goal Achievement</h3>
              <p className="text-muted-foreground">
                Stay motivated and achieve your goals with peer support and progress tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-muted/20 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">Frequently Asked Questions</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Everything you need to know about Elevare
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {/* FAQ Item 1 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    💡
                  </span>
                  What is Elevare?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Elevare is a comprehensive collaborative learning platform designed for students. It combines task management, note-taking, study groups, whiteboard collaboration, resource sharing, and video conferencing in one unified platform to help you excel academically.
              </div>
            </details>

            {/* FAQ Item 2 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    💰
                  </span>
                  Is Elevare really free?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Yes! Elevare is 100% free to use with no hidden costs. You get full access to all features including task management, notes, study groups, whiteboard, resource sharing, and video calls. No credit card required, ever.
              </div>
            </details>

            {/* FAQ Item 3 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    🔒
                  </span>
                  How secure is my data?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Your data security is our top priority. All data is encrypted in transit and at rest. You have complete control over your information, and we never share your data with third parties. You can export or delete your data at any time.
              </div>
            </details>

            {/* FAQ Item 4 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    👥
                  </span>
                  Can I collaborate with my classmates?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Absolutely! Elevare is built for collaboration. Create or join study groups, share resources, work together on whiteboards in real-time, chat with group members, and host video calls. Collaboration is at the heart of everything we do.
              </div>
            </details>

            {/* FAQ Item 5 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    📱
                  </span>
                  Is there a mobile app?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Elevare is fully responsive and works seamlessly on all devices through your web browser. You can access your tasks, notes, and study groups from your phone, tablet, or computer. Native mobile apps are coming soon!
              </div>
            </details>

            {/* FAQ Item 6 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    🎯
                  </span>
                  How do I get started?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Getting started is easy! Simply click the "Start Free Today" button, create your account with your email, and you'll be ready to go in seconds. No setup required – start organizing your studies immediately.
              </div>
            </details>

            {/* FAQ Item 7 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    💬
                  </span>
                  What if I need help?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                We're here to help! Access our comprehensive documentation, video tutorials, and community forums. You can also reach our support team directly through the help center. We typically respond within 24 hours.
              </div>
            </details>

            {/* FAQ Item 8 */}
            <details className="group rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-semibold text-foreground transition-colors">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    🌐
                  </span>
                  Can I use Elevare for any subject?
                </span>
                <span className="text-primary transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="border-t border-border/50 px-6 pb-6 pt-4 text-muted-foreground">
                Yes! Elevare is designed to work for any subject or field of study. Whether you're studying computer science, medicine, business, arts, or anything else, our flexible tools adapt to your needs. Organize your work your way.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Ready to Transform Your Academic Journey?
            </h2>
            <p className="mb-8 text-xl leading-relaxed text-muted-foreground">
              Join students who are already using Elevare to organize their studies, collaborate with peers, and achieve academic excellence.
            </p>
            <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <button className="bg-gradient-to-r from-primary via-secondary to-accent px-10 py-6 text-lg font-semibold text-white rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  Get Started for Free
                </button>
              </Link>
              <Link href="#features">
                <button className="border-2 border-primary px-10 py-6 text-lg font-semibold rounded-lg transition-all duration-300 hover:bg-primary/5">
                  Learn More
                </button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Always free • Full control of your data
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Elevare. Built for collaborative learning.</p>
        </div>
      </footer>
    </div>
  );
}
