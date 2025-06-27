import { CompanyAnalysisForm } from '@/components/CompanyAnalysisForm';
export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <div className="container mx-auto px-4 py-8">
                <div className="text-center mb-12">
                    {/* hello */}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Smart Form Handler
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Analyze any company website with AI and automatically populate form data
                        with industry insights, job roles, skills, and more.
                    </p>
                </div>

                <CompanyAnalysisForm />
            </div>
        </div>
    );
}