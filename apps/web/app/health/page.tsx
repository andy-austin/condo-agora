'use client'

import GraphQLStatusCard from '@/components/GraphQLStatusCard'
import { useTranslations } from 'next-intl'

export default function HealthPage() {
    const t = useTranslations('health')

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        {t('subtitle')}
                    </p>
                </div>

                <GraphQLStatusCard/>
            </div>
        </main>
    )
}
