'use client'

import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@renderer/components/ui/card"
import { Input } from "@renderer/components/ui/input"
import { Label } from "@renderer/components/ui/label"
import { ScrollArea } from "@renderer/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@renderer/components/ui/select"
import { Switch } from "@renderer/components/ui/switch"
import { Textarea } from "@renderer/components/ui/textarea"
import { useToast } from "@renderer/hooks/use-toast"
import { MessageSquare, Send, Usb } from "lucide-react"
import { useEffect, useRef, useState } from "react"


type Message = {
  content: string
  timestamp: Date
  type: 'sent' | 'received'
  useAbbreviations: boolean
}

export default function Component() {
  // COM Port States
  const [availablePorts, setAvailablePorts] = useState<string[]>([])
  const [selectedPort, setSelectedPort] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  // ASTM Message States
  const [patientId, setPatientId] = useState('123456')
  const [lastName, setLastName] = useState('Doe')
  const [firstName, setFirstName] = useState('John')
  const [middleInitial, setMiddleInitial] = useState('A')
  const [title, setTitle] = useState('Mr')
  const [dateOfBirth, setDateOfBirth] = useState('19850101')
  const [gender, setGender] = useState('M')
  const [specimenId, setSpecimenId] = useState('SPEC12345')
  const [testName, setTestName] = useState('Ferritin')
  const [sampleType, setSampleType] = useState('Serum')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [formattedMessage, setFormattedMessage] = useState('')
  const [useAbbreviations, setUseAbbreviations] = useState(false)

  const { toast } = useToast()
  const messageLogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshPorts()

    const cleanup = window.api.onReceiveData((data) => {
      const newMessage: Message = {
        content: data,
        timestamp: new Date(),
        type: 'received',
        useAbbreviations: false
      }
      setMessages(prev => [...prev, newMessage])
    })

    return () => {
      cleanup()
      if (isConnected) {
        handleDisconnect()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight
    }
  }

  const refreshPorts = async () => {
    try {
      const ports = await window.api.listSerialPorts()
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
      if (isConnected) {
        await handleDisconnect()
      }

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
    if (generatedMessage && isConnected) {
      try {
        await window.api.sendData(generatedMessage)

        const newMessage: Message = {
          content: generatedMessage,
          timestamp: new Date(),
          type: 'sent',
          useAbbreviations: useAbbreviations
        }
        setMessages(prev => [...prev, newMessage])
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        toast({
          title: "Send Failed",
          description: `Failed to send message: ${errorMessage}`,
          variant: "destructive"
        })

        if (errorMessage.includes('Port is not open')) {
          setIsConnected(false)
          setSelectedPort('')
        }
      }
    }
  }

  const asciiToAbbr: { [key: number]: string } = {
    0x02: 'STX',
    0x03: 'ETX',
    0x0D: 'CR',
    0x0A: 'LF',
    0x7F: 'DEL'
  }

  const formatMessage = (message: string, useAbbr: boolean) => {
    return message.split('').map(char => {
      const code = char.charCodeAt(0)
      if (code < 32 || code === 127) {
        if (useAbbr && asciiToAbbr[code]) {
          return `<${asciiToAbbr[code]}>`
        }
        return `<${code.toString(16).padStart(2, '0').toUpperCase()}>`
      }
      return char
    }).join('')
  }

  const buildMessage = () => {
    const STX = String.fromCharCode(0x02)
    const ETX = String.fromCharCode(0x03)
    const CR = String.fromCharCode(0x0D)
    const LF = String.fromCharCode(0x0A)

    const currentDate = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)

    const header = `H|\\^&|||LISMachine||||P|1|${currentDate}`
    const patientInfo = `P|1|${patientId}|||${lastName}^${firstName}^${middleInitial}^${title}||${dateOfBirth}|${gender}|||||||`
    const testOrder = `O|1|${specimenId}|||^^^${testName}|R||||||A||||${sampleType}`
    const terminator = 'L|1|F'

    const fullMessage = STX + header + CR + patientInfo + CR + testOrder + CR + terminator + ETX

    // Note: In a real implementation, you would calculate the actual checksum here
    const checksum = 'XX'

    return fullMessage + checksum + CR + LF
  }

  const handleGenerateMessage = () => {
    const message = buildMessage()
    setGeneratedMessage(message)
    setFormattedMessage(formatMessage(message, useAbbreviations))
  }

  const handleToggleAbbreviations = () => {
    setUseAbbreviations(!useAbbreviations)
    setFormattedMessage(formatMessage(generatedMessage, !useAbbreviations))
  }

  const handleToggleMessageAbbreviations = (index: number) => {
    setMessages(prev => prev.map((msg, i) =>
      i === index ? { ...msg, useAbbreviations: !msg.useAbbreviations } : msg
    ))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-grow container mx-auto p-4 flex gap-6">
        <div className="w-1/2 space-y-6 max-h-screen flex flex-col">
          <Card>
            <CardHeader>
              <CardTitle>COM Port Connection</CardTitle>
              <CardDescription>Connect to a COM port to send and receive messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card className='overflow-y-auto flex-1 pb-[100px]'>
            <CardHeader>
              <CardTitle>ASTM E1394 Message Builder</CardTitle>
              <CardDescription>Generate a sample message according to the ASTM E1394 standard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientId">Patient ID</Label>
                    <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleInitial">Middle Initial</Label>
                    <Input id="middleInitial" value={middleInitial} onChange={(e) => setMiddleInitial(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth (YYYYMMDD)</Label>
                    <Input id="dateOfBirth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender (M/F)</Label>
                    <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Test Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specimenId">Specimen ID</Label>
                    <Input id="specimenId" value={specimenId} onChange={(e) => setSpecimenId(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testName">Test Name</Label>
                    <Input id="testName" value={testName} onChange={(e) => setTestName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampleType">Sample Type</Label>
                    <Input id="sampleType" value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start space-y-4">
              <Button onClick={handleGenerateMessage}>Generate Message</Button>
              <div className="w-full space-y-2">
                <Label htmlFor="generatedMessage">Generated Message (Raw)</Label>
                <Textarea
                  id="generatedMessage"
                  value={generatedMessage}
                  readOnly
                  className="font-mono text-xs h-32"
                />
              </div>
              <div className="w-full space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="formattedMessage">Formatted Message (Human-readable)</Label>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="useAbbreviations" className="text-sm">Use Abbreviations</Label>
                    <Switch
                      id="useAbbreviations"
                      checked={useAbbreviations}
                      onCheckedChange={handleToggleAbbreviations}
                    />
                  </div>
                </div>
                <Textarea
                  id="formattedMessage"
                  value={formattedMessage}
                  readOnly
                  className="font-mono text-xs h-32 whitespace-pre-wrap"
                />
              </div>
              <Button

                onClick={() => handleSendMessage()}
                disabled={!isConnected || !generatedMessage}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Generated Message
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="w-1/2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Message Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-11rem)] w-full rounded-md border p-4 shadow-md" ref={messageLogRef}>
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[95%] rounded-lg px-3 py-2 overflow-x-auto ${msg.type === 'sent' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}
                    >
                      {formatMessage(msg.content, msg.useAbbreviations)}
                    </div>
                    <div className="flex items-center justify-between w-full mt-1">
                      <span className="text-xs text-muted-foreground">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`useAbbreviations-${index}`} className="text-xs">Use Abbreviations</Label>
                        <Switch
                          id={`useAbbreviations-${index}`}
                          checked={msg.useAbbreviations}
                          onCheckedChange={() => handleToggleMessageAbbreviations(index)}
                        />
                      </div>
                    </div>
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