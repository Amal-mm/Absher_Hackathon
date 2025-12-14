import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { GEMINI_API_KEY } from '@env';

// Fallback للـ API key في حالة عدم قراءته من .env
const API_KEY = GEMINI_API_KEY || 'AIzaSyDn1l8HwIoeJbt_Gky1hnS89GdKh2pcgWI';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
        Animated.timing(headerAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
  
    const userMessage = inputText.trim();
  
    // عرض رسالة المستخدم فقط
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setInputText('');
    setIsLoading(true);
  
    try {
      // التحقق من وجود API key
      console.log('API Key exists:', !!API_KEY);
      console.log('API Key length:', API_KEY ? API_KEY.length : 0);
      
      if (!API_KEY) {
        throw new Error('API key غير موجود');
      }

      // استدعاء Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;
      console.log('API URL:', apiUrl.substring(0, 80) + '...');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: userMessage
            }]
          }]
        })
      });

      // التحقق من حالة الاستجابة
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { text: aiResponse, isUser: false }]);
      } else if (data.error) {
        throw new Error(data.error.message || 'خطأ من API');
      } else {
        console.error('Unexpected response format:', data);
        throw new Error('تنسيق استجابة غير متوقع من API');
      }
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error.message || 'خطأ غير معروف';
      setMessages(prev => [...prev, { 
        text: `عذراً، حدث خطأ في الاتصال: ${errorMessage}. يرجى التحقق من API key والمحاولة مرة أخرى.`, 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };


      
  

  const handleSpeak = (text, index) => {
    if (isSpeaking && speakingIndex === index) {
      Speech.stop();
      setIsSpeaking(false);
      setSpeakingIndex(null);
    } else {
      Speech.stop();
      setIsSpeaking(true);
      setSpeakingIndex(index);
      Speech.speak(text, {
        language: 'ar-SA',
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          setSpeakingIndex(null);
        },
        onStopped: () => {
          setIsSpeaking(false);
          setSpeakingIndex(null);
        },
      });
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    Speech.stop();
    setIsSpeaking(false);
    setSpeakingIndex(null);
  };

  return (
    <ImageBackground
      source={require('./assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.mainContent, { opacity: fadeAnim }]}>
              
              {/* Header */}
              {!isKeyboardVisible && (
                <Animated.View 
                  style={[
                    styles.header,
                    {
                      opacity: headerAnim,
                      transform: [
                        {
                          translateY: headerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                          }),
                        },
                      ],
                    }
                  ]}
                >
                  <Text style={styles.headerTitle}>صلة</Text>
                  
                </Animated.View>
              )}

              {/* Compact Header when keyboard is visible */}
              {isKeyboardVisible && (
                <Animated.View 
                  style={[
                    styles.compactHeader,
                    {
                      opacity: headerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    }
                  ]}
                >
                  <Text style={styles.compactHeaderTitle}>صلة</Text>
                </Animated.View>
              )}

              {/* Messages Container */}
              <View style={styles.messagesCard}>
                {/* Delete Chat Button */}
                {messages.length > 0 && (
                  <View style={styles.deleteButtonContainer}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleClearChat}
                      activeOpacity={0.7}
                    >
                      <Icon name="delete-outline" size={20} color="#ef4444" />
                      
                    </TouchableOpacity>
                  </View>
                )}
                {messages.length === 0 && !isLoading && (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconContainer}>
                      <Icon name="chat-outline" size={56} color="#00653d" />
                    </View>
                    <Text style={styles.emptyText}>ابدأ محادثتك الآن</Text>
                    <Text style={styles.emptySubtext}>اكتب سؤالك وسأساعدك</Text>
                  </View>
                )}

                <View style={messages.length > 0 ? styles.messagesList : null}>
                {messages.map((message, index) => (
                  <View
                    key={index}
                    style={[
                      styles.messageWrapper,
                      message.isUser ? styles.userMessageWrapper : styles.aiMessageWrapper
                    ]}
                  >
                    {/* Avatar */}
                    {!message.isUser && (
                      <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                          <Icon name="robot" size={20} color="#ffffff" />
                        </View>
                      </View>
                    )}
                    
                    <View
                      style={[
                        styles.messageBubble,
                        message.isUser ? styles.userBubble : styles.aiBubble
                      ]}
                    >
                      <Text style={[
                        styles.messageText,
                        message.isUser ? styles.userText : styles.aiText
                      ]}>
                        {message.text}
                      </Text>
                      
                      {!message.isUser && (
                        <TouchableOpacity
                          style={styles.speakButton}
                          onPress={() => handleSpeak(message.text, index)}
                          activeOpacity={0.7}
                        >
                          <Icon 
                            name={isSpeaking && speakingIndex === index ? "stop-circle" : "volume-high"} 
                            size={16} 
                            color={isSpeaking && speakingIndex === index ? "#ef4444" : "#00653d"} 
                          />
                          <Text style={[
                            styles.speakButtonText,
                            isSpeaking && speakingIndex === index && styles.speakButtonTextActive
                          ]}>
                            {isSpeaking && speakingIndex === index ? 'إيقاف' : 'استماع'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* User Avatar */}
                    {message.isUser && (
                      <View style={styles.avatarContainer}>
                       
                          
                       
                      </View>
                    )}
                  </View>
                ))}
                </View>

                {isLoading && (
                  <View style={[styles.messageWrapper, styles.aiMessageWrapper]}>
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        <Icon name="robot" size={20} color="#ffffff" />
                      </View>
                    </View>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                      <ActivityIndicator size="small" color="#00653d" />
                      <Text style={styles.loadingText}>جاري الكتابة...</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Input Card */}
              <View style={styles.inputCard}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="اكتب رسالتك هنا..."
                      placeholderTextColor="#94a3b8"
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      textAlign="right"
                      editable={!isLoading}
                      maxLength={2000}
                    />
                    {inputText.length > 0 && (
                      <View style={styles.charCountContainer}>
                        <Text style={styles.charCountText}>{inputText.length}</Text>
                      </View>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    activeOpacity={0.7}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Icon name="send" size={22} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
                
                {inputText.length > 0 && (
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={() => setInputText('')}
                    activeOpacity={0.7}
                  >
                    <Icon name="close-circle" size={18} color="#ef4444" />
                    <Text style={styles.clearButtonText}>مسح</Text>
                  </TouchableOpacity>
                )}
              </View>

             
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    paddingTop: 8,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00653d',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  compactHeader: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginRight: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  compactHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00653d',
    textAlign: 'right',
    letterSpacing: 0.5,
  },

  // Messages Card
  messagesCard: {
    width: '100%',
    maxWidth: 550,
    minHeight: 200,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 24,
    position: 'relative',
  },
  deleteButtonContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  deleteButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
    marginRight: 6,
  },
  messagesList: {
    paddingTop: 50,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageWrapper: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  aiMessageWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00653d',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    backgroundColor: '#3b82f6',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#00653d',
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  userText: {
    color: '#ffffff',
    textAlign: 'right',
  },
  aiText: {
    color: '#1e293b',
    textAlign: 'right',
  },
  speakButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  speakButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00653d',
    marginRight: 6,
  },
  speakButtonTextActive: {
    color: '#ef4444',
  },
  loadingBubble: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748b',
    marginRight: 10,
    fontWeight: '500',
  },

  // Input Card Styles
  inputCard: {
    width: '100%',
    maxWidth: 550,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 56,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    position: 'relative',
  },
  textInput: {
    fontSize: 16,
    color: '#1e293b',
    textAlignVertical: 'top',
    lineHeight: 22,
    fontWeight: '400',
    paddingRight: 0,
    paddingLeft: 0,
    minHeight: 32,
  },
  charCountContainer: {
    position: 'absolute',
    left: 12,
    bottom: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  charCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00653d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00653d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0.1,
  },
  clearButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
    marginRight: 6,
  },

  // Info Card Styles
  infoCard: {
    width: '100%',
    maxWidth: 550,
    backgroundColor: 'rgba(240, 253, 244, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#166534',
    marginRight: 12,
    fontWeight: '600',
  },
});