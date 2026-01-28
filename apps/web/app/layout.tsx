import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const metadata = messages.metadata as { title: string; description: string };

  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang={locale}>
        <body>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
