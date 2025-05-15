
"use client";

import { useState } from "react";
import type { IdentifyMedicineOutput } from "@/ai/flows/identify-medicine";
import { identifyMedicine } from "@/ai/flows/identify-medicine";
import { ImageUploadForm } from "@/components/pill-identifier/ImageUploadForm";
import { MedicineResultDisplay } from "@/components/pill-identifier/MedicineResultDisplay";
import { PillIcon } from "lucide-react"; // Using PillIcon from lucide-react
import { useToast } from "@/hooks/use-toast";

export default function PillIdentifierPage() {
  const [result, setResult] = useState<IdentifyMedicineOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const { toast } = useToast();

  const handleSubmit = async (data: { photoDataUri: string; language: string }) => {
    setIsLoading(true);
    setError(null);
    setResult(null); 
    setCurrentLanguage(data.language);
    try {
      const response = await identifyMedicine({
        photoDataUri: data.photoDataUri,
        language: data.language,
      });
      setResult(response);
    } catch (e) {
      console.error("Error identifying medicine:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during identification.";
      
      let friendlyMessage = errorMessage;
      let toastTitle = "Identification Error";

      if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("API key not valid")) {
        toastTitle = "API Key Error";
        friendlyMessage = "The AI service reported an invalid API key. Please ensure your GEMINI_API_KEY in your .env file (for local development) or Vercel environment variables is correct, active, and the 'Generative Language API' is enabled in your Google Cloud project with billing active. Restart your server after .env changes. Original error: " + errorMessage;
      } else if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("model is overloaded") || errorMessage.toLowerCase().includes("service unavailable")) {
        toastTitle = "AI Service Busy";
        friendlyMessage = "The AI service is currently overloaded or temporarily unavailable. Please try again in a few moments. Original error: " + errorMessage;
      } else if (errorMessage.includes("DEADLINE_EXCEEDED")) {
        toastTitle = "Request Timeout";
        friendlyMessage = "The request to the AI service timed out. This could be due to a temporary network issue or the service being busy. Please try again. If the issue persists, the image might be too complex. Original error: " + errorMessage;
      } else if (errorMessage.includes("INVALID_ARGUMENT")) {
         toastTitle = "Invalid Input";
         friendlyMessage = "There was an issue with the uploaded image or selected language. Please check your input and try again. Original error: " + errorMessage;
      }
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: toastTitle,
        description: friendlyMessage,
        duration: 9000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="py-6 px-4 md:px-8 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex items-center gap-3">
          <PillIcon className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Pill Identifier
          </h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="md:sticky md:top-8"> 
            <ImageUploadForm onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
          <div>
            <MedicineResultDisplay data={result} isLoading={isLoading} error={error} language={currentLanguage} />
          </div>
        </div>
      </main>
      <footer className="py-4 px-4 md:px-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Pill Identifier. For informational purposes only. Always consult a healthcare professional.</p>
      </footer>
    </>
  );
}
