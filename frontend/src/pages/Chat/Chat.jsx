import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import api from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  TextField,
  IconButton,
  Paper,
  Chip,
  Divider,
  Avatar,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Voice Assistant states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const messagesEndRef = useRef(null);

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/chat/history/');
      setMessages(res.data);
    } catch (err) {
      showNotification('Failed to fetch chat logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();

    // Initialize Speech Recognition if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setInputValue(text);
        showNotification(`Dictated: "${text}"`, 'info');
      };

      recognitionRef.current = rec;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (textToSend) => {
    const prompt = textToSend || inputValue;
    if (!prompt.trim()) return;

    if (!textToSend) setInputValue('');

    // Optimistically update UI
    const tempUserMsg = { role: 'user', message: prompt, timestamp: new Date() };
    setMessages(prev => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await api.post('/ai/chat/', { message: prompt });
      const reply = res.data.response;
      
      const tempAiMsg = { role: 'model', message: reply, timestamp: res.data.timestamp || new Date() };
      setMessages(prev => [...prev, tempAiMsg]);

      // TTS Speech response if wanted
      // Speak the AI reply using native speechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // stop previous speech
        const utterance = new SpeechSynthesisUtterance(reply.replace(/[\*#_`]/g, '')); // clean markdown
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }

    } catch (err) {
      showNotification('Failed to get chatbot response.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Delete all messages?')) return;
    try {
      await api.delete('/ai/chat/history/');
      setMessages([]);
      showNotification('Conversation history cleared.');
    } catch (err) {
      showNotification('Failed to clear chat history.', 'error');
    }
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      showNotification('Speech recognition is not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleTextToSpeech = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[\*#_`]/g, ''));
      window.speechSynthesis.speak(utterance);
    }
  };

  const suggestedPrompts = [
    "Can I skip tomorrow?",
    "What's my attendance today?",
    "Which subject needs attention?",
    "How many lectures can I miss?"
  ];

  const formatBubbleTime = (timeStr) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AppLayout>
      <Box display="flex" flexDirection="column" sx={{ height: 'calc(100vh - 120px)' }}>
        {/* Chat Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" pb={2} borderBottom={1} borderColor="divider">
          <Box display="flex" alignItems="center" gap={1.5}>
            <AutoAwesomeIcon color="secondary" />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">Smartttend AI Assistant</Typography>
              <Typography variant="caption" color="text.secondary">Ask schedules, predictions, or goal planners</Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClearHistory} color="error" title="Clear Chat History">
            <DeleteSweepIcon />
          </IconButton>
        </Box>

        {/* Message Log Area */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={3} sx={{ color: 'text.secondary', p: 3, textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 60, opacity: 0.6 }} />
              <Typography variant="h6" fontWeight="bold">Hello! I am your AI Attendance Companion.</Typography>
              <Typography variant="body2" sx={{ maxWidth: 450 }}>
                I am connected to your database. Ask me if you can skip a class, what's your tomorrow's schedule, or how to hit your goals.
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1.5} justifyContent="center" sx={{ mt: 2 }}>
                {suggestedPrompts.map(p => (
                  <Chip key={p} label={p} onClick={() => handleSendMessage(p)} sx={{ cursor: 'pointer', py: 1.5, fontWeight: 'medium' }} variant="outlined" color="primary" />
                ))}
              </Box>
            </Box>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <Box key={index} display="flex" justifyContent={isUser ? 'flex-end' : 'flex-start'} sx={{ width: '100%', px: 1 }}>
                    <Box display="flex" gap={1.5} flexDirection={isUser ? 'row-reverse' : 'row'} sx={{ maxWidth: '75%' }}>
                      <Avatar sx={{ bgcolor: isUser ? 'primary.main' : 'secondary.main', width: 32, height: 32 }}>
                        {isUser ? 'U' : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                      </Avatar>
                      <Box>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            borderTopRightRadius: isUser ? 0 : 12,
                            borderTopLeftRadius: isUser ? 12 : 0,
                            bgcolor: isUser ? 'primary.main' : 'background.paper',
                            color: isUser ? 'primary.contrastText' : 'text.primary',
                            boxShadow: isUser ? 'none' : '0 4px 12px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Typography variant="body2" sx={{ lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {msg.message}
                          </Typography>
                        </Paper>
                        <Box display="flex" alignItems="center" gap={1} mt={0.5} sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatBubbleTime(msg.timestamp)}
                          </Typography>
                          {!isUser && (
                            <IconButton size="small" onClick={() => handleTextToSpeech(msg.message)} sx={{ p: 0 }}>
                              <VolumeUpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
              {sending && (
                <Box display="flex" justifyContent="flex-start" sx={{ width: '100%', px: 1 }}>
                  <Box display="flex" gap={1.5}>
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, borderTopLeftRadius: 0, bgcolor: 'action.hover' }}>
                      <Box display="flex" gap={0.5} alignItems="center" sx={{ height: 18 }}>
                        <CircularProgress size={14} color="inherit" />
                        <Typography variant="caption" sx={{ ml: 1, fontStyle: 'italic' }}>AI is checking logs...</Typography>
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input Text Form Area */}
        <Box borderTop={1} borderColor="divider" pt={2} display="flex" gap={1.5} alignItems="center">
          <IconButton color={isListening ? 'error' : 'primary'} onClick={toggleVoiceInput} title={isListening ? 'Stop Listening' : 'Speak Prompt'}>
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
          <TextField
            fullWidth
            size="small"
            placeholder={isListening ? 'Speak now...' : 'Ask your attendance assistant...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={sending}
          />
          <IconButton color="primary" onClick={() => handleSendMessage()} disabled={sending || !inputValue.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Snackbar alerts */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
};

export default Chat;
