import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to SongFlow</CardTitle>
          <CardDescription>
            Stream smarter with TikTok Live song requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("tiktok", { redirectTo: "/dashboard" });
            }}
          >
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-medium" 
              size="lg"
            >
              Continue with TikTok
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
