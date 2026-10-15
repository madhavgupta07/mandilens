"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Package, Calendar, Phone, Mail, User, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DataNote } from "@/components/domain/notes";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";

interface Listing {
  _id: string;
  type: "sell" | "buy";
  commodityName: string;
  commodity?: { name?: string; slug?: string } | null;
  quantity: number;
  unit: string;
  grade?: string;
  state: string;
  district: string;
  pricePerUnit?: number;
  priceUnit?: string;
  availabilityDate?: string;
  expiresAt?: string;
  description: string;
  contactPreference: string;
  contactPhone?: string;
  contactEmail?: string;
  status: string;
  viewCount?: number;
  isOwner?: boolean;
  user?: { name?: string; state?: string; district?: string };
  createdAt: string;
}

interface Match {
  listing: Listing;
  score: number;
  reasons: string[];
}

export function ListingDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [matches, setMatches] = React.useState<Match[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [message, setMessage] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [offer, setOffer] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<Listing>(`/api/listings/${id}`),
      apiFetch<{ matches: Match[] }>(`/api/listings/${id}/matches`).catch(() => ({ matches: [] })),
    ])
      .then(([listingData, matchData]) => {
        setListing(listingData);
        setMatches(matchData.matches ?? []);
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function sendInquiry() {
    if (!listing) return;
    if (message.trim().length < 10) {
      toast.error("Write at least 10 characters.");
      return;
    }
    setSending(true);
    try {
      await apiFetch("/api/inquiries", {
        method: "POST",
        json: {
          listingId: listing._id,
          message: message.trim(),
          quantityInterested: quantity ? Number(quantity) : undefined,
          offeredPricePerUnit: offer ? Number(offer) : undefined,
        },
      });
      toast.success("Inquiry sent. Track replies under Inquiries.");
      setMessage("");
      setQuantity("");
      setOffer("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="font-semibold">Listing not found</p>
          <p className="text-sm text-muted-foreground">{error ?? "It may have been removed."}</p>
        </CardContent>
      </Card>
    );
  }

  const canInquire = !listing.isOwner;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{listing.commodityName}</h1>
            <Badge variant={listing.type === "sell" ? "default" : "accent"} className="capitalize">
              {listing.type === "sell" ? "Selling" : "Buying"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {listing.status}
            </Badge>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {listing.district}, {listing.state}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-primary">
            {listing.pricePerUnit
              ? `${formatINR(listing.pricePerUnit)}`
              : "Price on request"}
          </p>
          {listing.pricePerUnit ? (
            <p className="text-xs text-muted-foreground">per {listing.priceUnit ?? "quintal"}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">
                      {listing.quantity} {listing.unit}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="font-medium">
                      {listing.availabilityDate ? formatDate(listing.availabilityDate) : "Now"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Posted by</p>
                    <p className="font-medium">{listing.user?.name ?? "A MandiLens user"}</p>
                  </div>
                </div>
              </div>
              {listing.grade ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Grade:</span> {listing.grade}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm text-foreground">{listing.description}</p>
              <p className="text-xs text-muted-foreground">
                Posted {formatDate(listing.createdAt)}
                {listing.viewCount ? ` · ${listing.viewCount} views` : ""}
              </p>
            </CardContent>
          </Card>

          {matches.length > 0 ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h2 className="font-semibold">Potential matches</h2>
                  <Badge variant="outline" className="font-normal">
                    {matches.length}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ranked by fit and explained. Treat these as leads to investigate, not as
                  confirmed deals.
                </p>
                <div className="space-y-3">
                  {matches.slice(0, 8).map((match) => (
                    <div
                      key={match.listing._id}
                      className="rounded-lg border border-border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/listings/${match.listing._id}`}
                            className="font-medium hover:underline"
                          >
                            {match.listing.commodityName} · {match.listing.quantity}{" "}
                            {match.listing.unit}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {match.listing.district}, {match.listing.state}
                            {match.listing.pricePerUnit
                              ? ` · ${formatINR(match.listing.pricePerUnit)}/${match.listing.priceUnit ?? "quintal"}`
                              : ""}
                          </p>
                        </div>
                        <Badge variant="secondary" className="font-normal">
                          fit {match.score}
                        </Badge>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {match.reasons.slice(0, 4).map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          {listing.isOwner ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <p className="font-semibold">This is your listing</p>
                <p className="text-sm text-muted-foreground">
                  Manage its status and view inquiries from your dashboard.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard">Go to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-semibold">Send an inquiry</h2>
                {!user ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Sign in to contact this seller and track the conversation.
                    </p>
                    <Button asChild className="w-full">
                      <Link href={`/login?next=/listings/${listing._id}`}>Sign in to inquire</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="inq-qty" className="text-xs">
                          Quantity ({listing.unit})
                        </Label>
                        <Input
                          id="inq-qty"
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={(event) => setQuantity(event.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="inq-offer" className="text-xs">
                          Offer ₹/{listing.priceUnit ?? "quintal"}
                        </Label>
                        <Input
                          id="inq-offer"
                          type="number"
                          min="0"
                          value={offer}
                          onChange={(event) => setOffer(event.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="inq-msg" className="text-xs">
                        Message
                      </Label>
                      <Textarea
                        id="inq-msg"
                        rows={4}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Introduce yourself and what you're looking for…"
                      />
                    </div>
                    <Button
                      onClick={sendInquiry}
                      disabled={sending || !canInquire}
                      className="w-full gap-1.5"
                    >
                      {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send inquiry
                    </Button>
                  </>
                )}

                {listing.contactPreference !== "in_app" ? (
                  <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Prefers contact via {listing.contactPreference}
                    </p>
                    {listing.contactPhone ? (
                      <p className="flex items-center gap-2">
                        <Phone className="size-3.5" /> {listing.contactPhone}
                      </p>
                    ) : null}
                    {listing.contactEmail ? (
                      <p className="flex items-center gap-2">
                        <Mail className="size-3.5" /> {listing.contactEmail}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <DataNote>
            MandiLens does not escrow payments or verify quality. Inspect goods before paying and
            use a settlement method you trust.
          </DataNote>
        </div>
      </div>
    </div>
  );
}
