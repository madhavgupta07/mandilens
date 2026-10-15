import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
        <Compass className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you are looking for doesn’t exist or may have moved. Try the market and commodity
        explorers instead.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/compare">Compare markets</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/markets">Browse markets</Link>
        </Button>
      </div>
    </div>
  );
}
