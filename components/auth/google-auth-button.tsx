import { signInWithGoogle } from "@/app/(auth)/actions";
import { GoogleSubmitButton } from "@/components/auth/google-submit-button";
import { getDictionary } from "@/lib/i18n/get-locale";

export async function GoogleAuthButton() {
  const { t } = await getDictionary();

  return (
    <form action={signInWithGoogle}>
      <GoogleSubmitButton label={t.auth.continueWithGoogle} />
    </form>
  );
}
