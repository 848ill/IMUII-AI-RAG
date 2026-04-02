"use client"

import Link from "next/link"
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton,
} from "@/components/ui/resizable-navbar"
import { useAuth } from "@/hooks/useAuth"
import { LogOut, User } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const NAV_ITEMS = [
  { name: "Beranda", link: "/" },
]

export function ResizableHeader() {
  const { user, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <Navbar>
      <NavBody>
        <NavbarLogo href="/" />
        <NavItems items={NAV_ITEMS} />
        <div className="relative z-20 flex items-center gap-2">
          {loading ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : user ? (
            <>
              <div className="hidden items-center gap-2 text-sm text-foreground/80 sm:flex">
                <User className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{user.email}</span>
              </div>
              <Button
                onClick={() => signOut()}
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2 border-red-900/50 text-red-400 hover:bg-red-950/50 hover:border-red-800"
                )}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <NavbarButton
                href="/login"
                variant="secondary"
                className="text-sm font-medium"
              >
                Masuk
              </NavbarButton>
              <NavbarButton
                href="/signup"
                variant="gradient"
                className="bg-[#0B3B75] from-[#0B3B75] to-[#1e5a9e] text-white"
              >
                Daftar
              </NavbarButton>
            </>
          )}
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo href="/" />
          <MobileNavToggle
            isOpen={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        </MobileNavHeader>
        <MobileNavMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.link}
              href={item.link}
              onClick={() => setMobileMenuOpen(false)}
              className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
            >
              {item.name}
            </Link>
          ))}
          {!loading && (
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <Button
                    onClick={() => {
                      signOut()
                      setMobileMenuOpen(false)
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-2 border-red-900/50 text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center text-sm font-medium"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-md bg-[#0B3B75] px-4 py-2 text-center text-sm font-bold text-white"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          )}
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  )
}
