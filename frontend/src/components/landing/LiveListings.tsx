import * as React from "react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"

import { ListingRow } from "@/components/ui/listing-row"
import { fetchOpenListings } from "@/lib/api"

function ListingSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(0,1.4fr)_88px_72px_64px_48px] gap-4 border-b border-border py-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-[4px] bg-surface-raised"
          style={{ opacity: 0.4 + (index % 2) * 0.2 }}
        />
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
    <section className="border-t border-border bg-surface px-6 py-24 md:py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 flex items-end justify-between gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25 }}
            className="font-heading text-[clamp(2rem,4vw,2.5rem)] text-text"
          >
            Live listings
          </motion.h2>
          <Link
            to="/browse"
            className="text-[14px] text-text-muted transition-opacity hover:opacity-85"
          >
            View all →
          </Link>
        </div>

        <div className="border-t border-border">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_88px_72px_64px_48px] gap-4 border-b border-border py-3 font-label text-[12px] text-text-muted md:grid">
            <span>Route</span>
            <span>Kind</span>
            <span>Date</span>
            <span>Price</span>
            <span />
          </div>

          {isLoading && (
            <div>
              {Array.from({ length: 3 }).map((_, index) => (
                <ListingSkeleton key={index} />
              ))}
            </div>
          )}

          {isError && (
            <p className="py-8 text-text-muted">
              Listings are temporarily unavailable. Check back shortly.
            </p>
          )}

          {data?.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <ListingRow listing={listing} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
