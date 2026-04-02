import { cn } from "@/lib/utils"

export function HeroSection() {
  return (
    <section className={cn("container space-y-6 py-12 md:py-16 lg:py-20")}>
      <div className="mx-auto flex max-w-[980px] flex-col items-center gap-2 text-center">
        <h1 className={cn("text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]")}>
          IMUII
        </h1>
        <p className={cn("max-w-[750px] text-lg text-muted-foreground sm:text-xl")}>
          Asisten virtual Universitas Islam Indonesia dengan sentuhan biru-emas UII
        </p>
      </div>
    </section>
  )
}

