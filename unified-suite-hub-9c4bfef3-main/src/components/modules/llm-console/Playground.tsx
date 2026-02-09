import { useState } from 'react';
import { Send, Settings, Trash2, Copy, Edit, Share2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const mockMessages: Message[] = [
  { id: '1', role: 'user', content: 'Hello!' },
  { id: '2', role: 'assistant', content: 'Hi! How can I help you today?' },
];

export function Playground() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const [temperature, setTemperature] = useState([0.7]);
  const [model, setModel] = useState('gpt-4o');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: input },
    ]);
    setInput('');
    // Simulate assistant response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a simulated response from the AI assistant.',
        },
      ]);
    }, 1000);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)] animate-fade-in p-6 min-h-[calc(100vh-60px)]">
      {/* Config Panel */}
      <Card className="w-72 flex-shrink-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Model Config
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom Request Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">Custom Request Body</Label>
            <Switch />
          </div>

          {/* Group Select */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">👥</span>
              Group
            </Label>
            <Select defaultValue="default">
              <SelectTrigger>
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Group</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Select */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">🤖</span>
              Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Image URL Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">🖼️</span>
                Image URL
              </Label>
              <Switch />
            </div>
            <p className="text-xs text-muted-foreground">
              Enable to add image URLs for multimodal conversations
            </p>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <span className="text-muted-foreground">🌡️</span>
                Temperature
              </Label>
              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {temperature[0].toFixed(1)}
              </span>
            </div>
            <Slider
              value={temperature}
              onValueChange={setTemperature}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              Controls randomness and creativity of outputs
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button variant="default" className="flex-1">
              Export
            </Button>
            <Button variant="outline" className="flex-1">
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Panel */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-row items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <CardTitle className="text-base font-medium">AI Conversation</CardTitle>
            <span className="text-sm text-muted-foreground">{model}</span>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Eye className="w-4 h-4 mr-1" />
            Show Debug
          </Button>
        </CardHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3',
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      'text-xs',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2.5',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity',
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Trash2 className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Enter your question..."
                className="pr-12"
              />
              <Button
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
