import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { useToast } from '@renderer/hooks/use-toast'
import { MessageSquare, Send, Usb } from 'lucide-react'
import { useEffect, useState } from 'react'

type Message = {
  content: string
  timestamp: Date
  type: 'sent' | 'received'
}

export default function Component() {
  const [availablePorts, setAvailablePorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const { toast } = useToast()

  useEffect(() => {
    // Get available ports on component mount
    refreshPorts()

    // Set up listener for incoming data
    const cleanup = window.api.onReceiveData((data) => {
      const newMessage: Message = {
        content: data,
        timestamp: new Date(),
        type: 'received'
      }
      setMessages(prev => [...prev, newMessage])
    })

    return () => {
      cleanup()
      // Disconnect port when component unmounts
      if (isConnected) {
        handleDisconnect()
      }
    }
  }, [])

  const refreshPorts = async () => {
    try {
      const ports = await window.api.listSerialPorts();
      setAvailablePorts(ports)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to list serial ports",
        variant: "destructive"
      })
    }
  }

  const handlePortSelect = async (port: string) => {
    try {
      // First ensure any existing connection is closed
      if (isConnected) {
        await handleDisconnect()
      }
  
      // Attempt to connect to the port
      await window.api.connectPort(port)
      setSelectedPort(port)
      setIsConnected(true)
      toast({
        title: "Connected",
        description: `Successfully connected to ${port}`
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: "Connection Failed",
        description: errorMessage.includes('Access denied') 
          ? "Port access denied. Please close Arduino Serial Monitor and try again."
          : `Could not connect to ${port}: ${errorMessage}`,
        variant: "destructive"
      })
      // Reset states on error
      setSelectedPort('')
      setIsConnected(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await window.api.disconnectPort()
      setSelectedPort('')
      setIsConnected(false)
      toast({
        title: "Disconnected",
        description: "Serial port disconnected"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive"
      })
    }
  }

  const handleSendMessage = async () => {
    if (message && isConnected) {
      try {
        await window.api.sendData(message)
        
        const newMessage: Message = {
          content: message,
          timestamp: new Date(),
          type: 'sent'
        }
        setMessages(prev => [...prev, newMessage])
        setMessage('')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        toast({
          title: "Send Failed",
          description: `Failed to send message: ${errorMessage}`,
          variant: "destructive"
        })
        
        // If port was closed, update connection state
        if (errorMessage.includes('Port is not open')) {
          setIsConnected(false)
          setSelectedPort('')
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow container mx-auto p-4 flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/3 space-y-4">
          <div className="flex items-center space-x-2">
            <Select 
              onValueChange={handlePortSelect} 
              value={selectedPort}
              disabled={isConnected}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select COM Port" />
              </SelectTrigger>
              <SelectContent>
                {availablePorts.map(port => (
                  <SelectItem key={port} value={port}>{port}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={refreshPorts}
              disabled={isConnected}
            >
              <Usb className="h-4 w-4" />
            </Button>
          </div>
          
          {isConnected && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                Connected to {selectedPort}
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Input 
              type="text" 
              placeholder="Enter message" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-grow"
              disabled={!isConnected}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!isConnected || !message}
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>

        <Card className="lg:w-2/3 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Message Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-140px)] w-full rounded-md">
              <div className="p-4 space-y-2">
                {messages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.type === 'sent' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}