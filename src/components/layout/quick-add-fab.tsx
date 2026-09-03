"use client"

import * as React from "react"
import { useState } from "react"
import Link from "next/link"
import { Plus, ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export function QuickAddFab() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative z-50">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet Actions */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed bottom-24 left-4 right-4 bg-card rounded-2xl p-4 shadow-xl z-50 md:hidden elevation-medium border border-border"
          >
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-2">Quick Add</h3>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/transactions/new?type=expense"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:bg-muted transition-colors"
              >
                <div className="bg-danger/10 text-danger p-3 rounded-full">
                  <ArrowDown className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Expense</span>
              </Link>
              <Link
                href="/transactions/new?type=income"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:bg-muted transition-colors"
              >
                <div className="bg-positive/10 text-positive p-3 rounded-full">
                  <ArrowUp className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Income</span>
              </Link>
              <Link
                href="/transactions/new?type=transfer"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted active:bg-muted transition-colors"
              >
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <ArrowRightLeft className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Transfer</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <div className="relative -top-5 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
          aria-label="Quick Add"
          aria-expanded={isOpen}
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="h-6 w-6" />
          </motion.div>
        </button>
      </div>
    </div>
  )
}
