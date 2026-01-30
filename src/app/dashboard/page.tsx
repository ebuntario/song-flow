import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LiveSessionPanel } from "@/components/live-session-panel";
import { getSpotifyToken } from "@/lib/spotify/client";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const spotifyToken = await getSpotifyToken(session.user.id);

  return (
    <div className="min-h-screen max-w-md mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image 
              src={session.user.image} 
              alt={session.user.name ?? "User"} 
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border border-border"
            />
          )}
          <div>
            <h1 className="font-semibold">{session.user.name}</h1>
            <p className="text-xs text-muted-foreground">@{session.user.tiktokUsername || "tiktok_user"}</p>
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button variant="ghost" size="sm">Log out</Button>
        </form>
      </header>

      <Separator />

      {/* Spotify Connection Status */}
      {!spotifyToken ? (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="text-yellow-500">Connect Spotify</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-500/80 mb-4">
              Link your Spotify account to enable song requests.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("spotify", { redirectTo: "/dashboard" });
              }}
            >
              <Button 
                variant="outline" 
                className="w-full border-yellow-500/50 hover:bg-yellow-500/20 hover:text-yellow-500"
              >
                Connect Spotify
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <LiveSessionPanel />
      )}
    </div>
  );
}
