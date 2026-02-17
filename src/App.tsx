if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
  (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
import { useState, useRef, useEffect } from 'react';
import { Upload, Send, FileText, X, Loader2 } from 'lucide-react';
import { config } from './config';

const API_BASE_URL = config.apiUrl;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UserProfile {
  id?: number;
  experience: string;
  training: string;
}

interface UploadedFile {
  id: number;
  name: string;
  content: string;
}

export default function TRForhandlingsbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user has existing profile on mount
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/profile`, {});
        const data = await response.json();

        if (data.user && data.user.experience && data.user.training) {
          setUserProfile(data.user);
          setShowOnboarding(false);

          // Load conversation history
          const historyResponse = await fetch(
            `${API_BASE_URL}/api/chat/history`,
            {}
          );
          const historyData = await historyResponse.json();

          if (historyData.messages && historyData.messages.length > 0) {
            setMessages(historyData.messages);
          } else {
            // Show welcome message
            const welcomeMessage = generateWelcomeMessage(
              data.user.experience,
              data.user.training
            );
            setMessages([{ role: 'assistant', content: welcomeMessage }]);
          }

          // Load uploaded files
          const filesResponse = await fetch(`${API_BASE_URL}/api/files`, {});
          const filesData = await filesResponse.json();

          if (filesData.files) {
            setUploadedFiles(
              filesData.files.map((f: any) => ({
                id: f.id,
                name: f.name,
                content: f.content,
              }))
            );
          }
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkProfile();
  }, []);

  const generateWelcomeMessage = (experience: string, training: string) => {
    let welcomeMessage = `Velkommen! Jeg er her for at hjælpe dig med forhandlingsrådgivning. `;

    if (experience === 'under1') {
      welcomeMessage += `Jeg kan se, du er relativt ny som tillidsrepræsentant. `;
      if (training === 'no') {
        welcomeMessage += `Da du endnu ikke har været på TR-kursus, vil jeg sørge for at forklare grundlæggende begreber og teknikker grundigt.`;
      } else {
        welcomeMessage += `Det er godt, du allerede har været på kursus - jeg kan hjælpe dig med at omsætte teorien til praksis.`;
      }
    } else if (experience === '1-3') {
      welcomeMessage += `Med din erfaring har du sikkert mødt forskellige forhandlingssituationer. `;
      if (training === 'no') {
        welcomeMessage += `Jeg anbefaler at komme på TR-kursus, men indtil da kan jeg guide dig gennem specifikke situationer.`;
      } else {
        welcomeMessage += `Med både erfaring og kursusbaggrund kan jeg hjælpe dig med at finpudse dine teknikker.`;
      }
    } else {
      welcomeMessage += `Med din lange erfaring som TR kender du nok til mange situationer. `;
      if (training === 'no') {
        welcomeMessage += `Selvom du har erfaring, kan et opdateret TR-kursus give dig nye værktøjer.`;
      } else {
        welcomeMessage += `Med din kombination af erfaring og kursusbaggrund kan jeg være sparringspartner i komplekse forhandlinger.`;
      }
    }

    welcomeMessage += `\n\nDu kan uploade dokumenter (PDF, TXT, Excel) for at jeg kan give mere specifik rådgivning. Hvad kan jeg hjælpe dig med i dag?`;

    return welcomeMessage;
  };

  const handleOnboardingComplete = async (experience: string, training: string) => {
    if (!experience || !training) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({ experience, training }),
      });

      const data = await response.json();

      if (data.success) {
        const profile = data.user;
        setUserProfile(profile);
        setShowOnboarding(false);

        const welcomeMessage = generateWelcomeMessage(experience, training);
        setMessages([{ role: 'assistant', content: welcomeMessage }]);
      }
    } catch (error) {
      console.error('Profile save failed:', error);
      alert('Fejl ved gemning af profil. Prøv igen.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/files`, {
          method: 'POST',

          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();

        if (data.success && data.file) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: data.file.id,
              name: data.file.name,
              content: data.file.content,
            },
          ]);

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `✅ Jeg har læst "${data.file.name}" og er klar til at bruge indholdet i vores rådgivning.`,
            },
          ]);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Fejl ved upload af ${(file as File).name}. Prøv evt. at gemme dokumentet som en simpel .txt fil.`,
          },
        ]);
      }
    }
  };

  const removeFile = async (fileId: number, fileName: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      });

      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `🗑️ Fjernet dokument: ${fileName}`,
        },
      ]);
    } catch (error) {
      console.error('Delete file error:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add a placeholder for the assistant's message
    const assistantMessageIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const fileContents = uploadedFiles.map((f) => ({
        name: f.name,
        content: f.content,
      }));

      const response = await fetch(`${API_BASE_URL}/api/chat/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          message: userMessage,
          fileContents: fileContents,
        }),
      });

      if (!response.ok) {
        throw new Error(`API fejl: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Ingen response body');
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let buffer = ''; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines but keep the last incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (!data) continue; // Skip empty data

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.done) {
                // Streaming complete
                break;
              }

              if (parsed.content) {
                accumulatedContent += parsed.content;

                // Update the assistant message with the new content
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedContent,
                  };
                  return updated;
                });
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMessageIndex] = {
          role: 'assistant',
          content: `⚠️ Der opstod en fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}. Prøv venligst igen.`,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
              TR Forhandlingsbot
            </h1>
            <p className="text-gray-600 text-lg">
              Din personlige forhandlingsrådgiver
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                1. Hvor længe har du samlet været TR?
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'under1', label: 'Under 1 år' },
                  { value: '1-3', label: '1-3 år' },
                  { value: 'over3', label: 'Over 3 år' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setUserProfile({
                        experience: option.value,
                        training: userProfile?.training || '',
                      })
                    }
                    className={`w-full py-4 px-6 rounded-lg font-medium transition-all transform hover:scale-105 ${
                      userProfile?.experience === option.value
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                2. Har du været på TR-kursus inden for de seneste tre år?
              </h2>
              <div className="space-y-3">
                {[
                  { value: 'yes', label: 'Ja' },
                  { value: 'no', label: 'Nej' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      setUserProfile({
                        experience: userProfile?.experience || '',
                        training: option.value,
                      })
                    }
                    className={`w-full py-4 px-6 rounded-lg font-medium transition-all transform hover:scale-105 ${
                      userProfile?.training === option.value
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() =>
                handleOnboardingComplete(
                  userProfile?.experience || '',
                  userProfile?.training || ''
                )
              }
              disabled={!userProfile?.experience || !userProfile?.training}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform ${
                userProfile?.experience && userProfile?.training
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Kom i gang 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200 p-4">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          TR Forhandlingsbot
        </h1>
        <p className="text-sm text-gray-600">
          Din personlige forhandlingsrådgiver
        </p>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <button
                  onClick={() => removeFile(file.id, file.name)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'system' ? (
              <div className="bg-yellow-100 text-yellow-800 rounded-lg px-4 py-2 text-sm">
                {msg.content}
              </div>
            ) : (
              <div
                className={`max-w-3xl rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-md">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.pdf,.xlsx,.xls,.csv,.docx,.doc"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg transition-all"
            title="Upload dokumenter"
          >
            <Upload className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Stil et spørgsmål om forhandling..."
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-3 rounded-xl transition-all ${
              isLoading || !input.trim()
                ? 'bg-gray-300 text-gray-500'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
