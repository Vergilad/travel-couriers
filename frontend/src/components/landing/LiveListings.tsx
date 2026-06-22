import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"

import { LivePulse } from "@/components/landing/LivePulse"
import { staggerContainer, scrollReveal } from "@/components/landing/motion"
import { ListingRow } from "@/components/ui/listing-row"
import { fetchOpenListings } from "@/lib/api"

function ListingSkeleton() {
  return (
    <div className="space-y-3 border-b border-border py-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <motion.div
          key={index}
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.15 }}
          className="font-data text-[12px] text-text-faint"
        >
          Loading route · · · · · ·
        </motion.div>
      ))}
    </div>
  )
}

export function LiveListings() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["listings", "open", 5],
    queryFn: () => fetchOpenListings(5),
  })

  return (
    <div className="relative border-t border-border bg-surface px-6 py-24 md:py-32">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-accent/40"
        animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "left center" }}
      />

      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <motion.h2
              variants={scrollReveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="font-heading text-[clamp(2rem,4vw,2.5rem)] text-text"
            >
              Live listings
            </motion.h2>
            <LivePulse label="Updating" />
          </div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            whileHover={{ x: 4 }}
          >
            <Link
              to="/browse"
              className="text-[14px] text-text-muted transition-opacity hover:text-accent"
            >
              View all →
            </Link>
          </motion.div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="border-t border-border"
        >
          <div className="hidden grid-cols-[minmax(0,1.4fr)_88px_72px_64px_48px] gap-4 border-b border-border py-3 font-label text-[12px] text-text-muted md:grid">
            <span>Route</span>
            <span>Kind</span>
            <span>Date</span>
            <span>Price</span>
            <span />
          </div>

          {isLoading && <ListingSkeleton />}

          {isError && (
            <p className="py-8 text-text-muted">
              Listings are temporarily unavailable. Check back shortly.
            </p>
          )}

          {data?.map((listing, index) => (
            <motion.div
              key={listing.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 24, rotate: 0.6 },
                show: {
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  transition: {
                    type: "spring",
                    stiffness: 100,
                    damping: 22,
                    delay: index * 0.04,
                  },
                },
              }}
            >
              <ListingRow listing={listing} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
