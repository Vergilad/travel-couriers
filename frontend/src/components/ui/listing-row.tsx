import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import {
  formatListingDate,
  formatPrice,
  formatRoute,
  kindLabel,
} from "@/lib/listings"
import { cn } from "@/lib/utils"
import type { Listing } from "@/types/listing"

interface ListingRowProps {
  listing: Listing
  className?: string
}

export function ListingRow({ listing, className }: ListingRowProps) {
  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className={cn(
        "group block border-b border-border py-4 transition-colors hover:bg-surface-raised/40 md:grid md:grid-cols-[minmax(0,1.4fr)_88px_72px_64px_48px] md:items-center md:gap-4",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3 md:mb-0 md:contents">
        <span className="font-data text-[12px]">{formatRoute(listing)}</span>
        <Badge variant={listing.kind}>{kindLabel(listing.kind)}</Badge>
      </div>
      <div className="flex items-center justify-between gap-3 md:contents">
        <span className="font-data text-[12px]">{formatListingDate(listing.depart_date)}</span>
        <span className="font-data text-[12px]">{formatPrice(listing.price, listing.currency)}</span>
        <span className="font-data text-[12px] opacity-100 transition-opacity md:text-right md:opacity-0 md:group-hover:opacity-100">
          View
        </span>
      </div>
    </Link>
  )
}
