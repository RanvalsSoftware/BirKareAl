import { z } from 'zod';
import { apiRequest } from '@/api/client';
import { useAuthStore, type AuthUser } from '@/features/auth/auth-store';

const name = z
  .string()
  .trim()
  .max(80, 'En fazla 80 karakter girebilirsin.')
  .refine((value) => !/\p{Cc}/u.test(value), 'Geçerli bir ad gir.')
  .transform((value) => value.replace(/\s+/g, ' '));

export const profileNameSchema = z.object({
  firstName: name.pipe(z.string().min(1, 'Adını gir.')),
  lastName: name.transform((value) => value || null),
});

/** Only persist editable name fields, never email/verification/role from form data. */
export async function updateAccountProfile(
  input: { firstName: string; lastName: string },
  expectedUserId: string,
): Promise<AuthUser> {
  const names = profileNameSchema.parse(input);
  const assertCurrentAccount = () => {
    const auth = useAuthStore.getState();
    if (auth.state !== 'authenticated' || auth.user?.id !== expectedUserId) {
      throw new Error('Hesabın değişti. Profilini geçerli hesabında yeniden düzenle.');
    }
  };
  assertCurrentAccount();
  const { user } = await apiRequest<{ user: AuthUser }>('/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(names),
  });
  assertCurrentAccount();
  if (user.id !== expectedUserId) throw new Error('Sunucu profil yanıtı doğrulanamadı.');
  useAuthStore.setState({ user });
  return user;
}
