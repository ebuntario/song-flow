import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSpotifyToken } from "@/lib/spotify/client";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const spotifyToken = await getSpotifyToken(session.user.id);

  return (
    <div className="min-h-screen max-w-md mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img 
              src={session.user.image} 
              alt={session.user.name ?? "User"} 
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Live Session</h2>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-sm font-medium text-red-500">Offline</span>
                </div>
            </div>

            <Button size="lg" className="w-full h-14 text-lg bg-green-600 hover:bg-green-700">
                Start Session
            </Button>
        </div>
      )}

      {/* Queue Section (Placeholder) */}
        {spotifyToken && (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Queue (0)</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    No requests yet.
                </CardContent>
            </Card>
        )}
    </div>
  );
}
