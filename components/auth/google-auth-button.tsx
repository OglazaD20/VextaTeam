import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleSubmitButton } from "@/components/auth/google-submit-button";
import { getDictionary } from "@/lib/i18n/get-locale";

export async function GoogleAuthButton({ redirectTo }: { redirectTo?: string }) {
  const { t } = await getDictionary();

  return (
    <form action={signInWithGoogle.bind(null, redirectTo ?? null)}>
      <GoogleSubmitButton label={t.auth.continueWithGoogle} />
    </form>
  );
}
