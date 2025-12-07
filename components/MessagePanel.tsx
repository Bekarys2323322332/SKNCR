import Ionicons from "@expo/vector-icons/Ionicons";
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

export interface PanelAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface MessagePanelProps {
  visible: boolean;
  title: string;
  message: string;
  actions: PanelAction[];
  onClose: () => void;
  darkMode?: boolean;
}

const MessagePanel: React.FC<MessagePanelProps> = ({
  visible,
  title,
  message,
  actions,
  onClose,
  darkMode = false
}) => {
  const modalBg = darkMode ? '#2d3748' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const primaryColor = '#5C6BC0';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20
      }}>
        <View style={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: modalBg,
          borderRadius: 16,
          padding: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Ionicons name="close" size={22} color={textColor} />
            </TouchableOpacity>
          </View>

          <Text style={{
            color: secondaryTextColor,
            fontSize: 16,
            lineHeight: 22,
            marginBottom: 24
          }}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  try {
                    action.onPress && action.onPress();
                  } catch (e) {
                    console.error(e);
                  }
                  if (action.style !== 'cancel') onClose();
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                  backgroundColor: action.style === 'destructive' ? '#ef4444' : primaryColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 4
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MessagePanel;