import type { MailMessage } from './mail.service.js';
import { communicationLanguage } from './request-language.js';

/** Reuses the already validated link and token; never changes token semantics. */
export function localizeAuthMail(message: MailMessage, input: {
  kind: 'verification' | 'password-reset'; token: string; link: string; locale?: string;
}): MailMessage {
  const language = communicationLanguage(input.locale);
  if (!language || language === 'tr') return message;
  const verification = input.kind === 'verification';
  const copy = {
    en: {
      verify: 'Verify your email address', reset: 'Reset your password', open: 'Open the app',
      verificationCode: 'Your six-digit verification code', resetCode: 'Code to paste into the password reset screen',
      validity: `This link and code are valid for ${verification ? '10 minutes' : '1 hour'} and can only be used once.`,
      ignore: 'If you did not make this request, ignore this email. Never share your code.',
      password: 'BirKare Studio will never ask for your password by email.',
    },
    de: {
      verify: 'E-Mail-Adresse bestätigen', reset: 'Passwort zurücksetzen', open: 'App öffnen',
      verificationCode: 'Dein sechsstelliger Bestätigungscode', resetCode: 'Code für den Bildschirm zum Zurücksetzen des Passworts',
      validity: `Dieser Link und Code sind ${verification ? '10 Minuten' : '1 Stunde'} gültig und können nur einmal verwendet werden.`,
      ignore: 'Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail. Teile deinen Code niemals.',
      password: 'BirKare Studio wird dich niemals per E-Mail nach deinem Passwort fragen.',
    },
    es: {
      verify: 'Verifica tu correo electrónico', reset: 'Restablece tu contraseña', open: 'Abrir la aplicación',
      verificationCode: 'Tu código de verificación de seis dígitos', resetCode: 'Código para pegar en la pantalla de restablecimiento de contraseña',
      validity: `Este enlace y código son válidos durante ${verification ? '10 minutos' : '1 hora'} y solo se pueden usar una vez.`,
      ignore: 'Si no hiciste esta solicitud, ignora este correo. No compartas nunca tu código.',
      password: 'BirKare Studio nunca te pedirá tu contraseña por correo electrónico.',
    },
    ar: {
      verify: 'تأكيد عنوان بريدك الإلكتروني', reset: 'إعادة تعيين كلمة المرور', open: 'افتح التطبيق',
      verificationCode: 'رمز التحقق المكوّن من ستة أرقام', resetCode: 'الرمز المطلوب لصقه في شاشة إعادة تعيين كلمة المرور',
      validity: `هذا الرابط والرمز صالحان لمدة ${verification ? '10 دقائق' : 'ساعة واحدة'} ويمكن استخدامهما مرة واحدة فقط.`,
      ignore: 'إذا لم تطلب ذلك، فتجاهل هذه الرسالة. لا تشارك رمزك مع أي شخص.',
      password: 'لن يطلب منك BirKare Studio كلمة مرورك عبر البريد الإلكتروني مطلقًا.',
    },
  }[language];
  const title = verification ? copy.verify : copy.reset;
  return {
    ...message,
    subject: `BirKare Studio — ${title}`,
    text: [
      `BirKare Studio — ${title}`, '',
      `${copy.open}: ${input.link}`, '',
      verification
        ? `${copy.verificationCode}: ${input.token}`
        : `${copy.resetCode}: ${input.token}`, '',
      copy.validity, copy.ignore, copy.password,
    ].join('\n'),
  };
}

export function localizeDeletionMail(message: MailMessage, input: {
  link: string; locale?: string;
}): MailMessage {
  const language = communicationLanguage(input.locale);
  if (!language || language === 'tr') return message;
  const copy = {
    en: {
      subject: 'Your account deletion link', title: 'Account deletion request',
      open: 'To continue your account deletion request, open the one-time link below:',
      validity: 'This link is valid for 30 minutes and can only be used once.',
      ignore: 'If you did not request this link, ignore this email. Your account will not be changed.',
      password: 'BirKare Studio will never ask for your password by email to complete this request.',
    },
    de: {
      subject: 'Link zur Kontolöschung', title: 'Anfrage zur Kontolöschung',
      open: 'Öffne den folgenden einmalig verwendbaren Link, um die Kontolöschung fortzusetzen:',
      validity: 'Dieser Link ist 30 Minuten gültig und kann nur einmal verwendet werden.',
      ignore: 'Wenn du diesen Link nicht angefordert hast, ignoriere diese E-Mail. Dein Konto bleibt unverändert.',
      password: 'BirKare Studio wird dich für diesen Vorgang niemals per E-Mail nach deinem Passwort fragen.',
    },
    es: {
      subject: 'Enlace para eliminar tu cuenta', title: 'Solicitud de eliminación de cuenta',
      open: 'Para continuar con la eliminación de tu cuenta, abre el siguiente enlace de un solo uso:',
      validity: 'Este enlace es válido durante 30 minutos y solo se puede usar una vez.',
      ignore: 'Si no solicitaste este enlace, ignora este correo. Tu cuenta no sufrirá ningún cambio.',
      password: 'BirKare Studio nunca te pedirá tu contraseña por correo para completar esta solicitud.',
    },
    ar: {
      subject: 'رابط حذف حسابك', title: 'طلب حذف الحساب',
      open: 'لمتابعة حذف حسابك، افتح الرابط التالي المخصص للاستخدام مرة واحدة:',
      validity: 'هذا الرابط صالح لمدة 30 دقيقة ويمكن استخدامه مرة واحدة فقط.',
      ignore: 'إذا لم تطلب هذا الرابط، فتجاهل الرسالة. لن يطرأ أي تغيير على حسابك.',
      password: 'لن يطلب منك BirKare Studio كلمة مرورك عبر البريد الإلكتروني لإكمال هذا الطلب.',
    },
  }[language];
  return {
    ...message,
    subject: `BirKare Studio — ${copy.subject}`,
    text: [
      `BirKare Studio — ${copy.title}`, '', copy.open,
      input.link, '',
      copy.validity, copy.ignore, copy.password,
    ].join('\n'),
  };
}
