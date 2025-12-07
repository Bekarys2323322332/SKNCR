import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface ErrorModalProps {
  visible: boolean;
  message: string;
  title: string;
  darkMode?: boolean;
  onClose: () => void;
}


const ErrorModal = ({ visible, message, title, onClose, darkMode = false }: ErrorModalProps) => {
  const modalBg = darkMode ? '#2d3748' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const primaryColor = '#5C6BC0';
  
  return (
    <Modal visible={visible} transparent animationType="fade">
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
          <View className="items-center mb-4">
            <Ionicons name="alert-circle" size={40} color="#D32F2F" />
          </View>
          <Text className="text-3xl font-semibold text-center text-[#D32F2F]">
            {title}
          </Text>

          <Text style={{ color: secondaryTextColor }} className="text-center mt-2">{message}</Text>

          <TouchableOpacity
            onPress={onClose}
            style={{ backgroundColor: primaryColor }}
            className="mt-6 py-3 rounded-xl items-center"
          >
            <Text style={{ color: textColor }} className="font-semibold text-lg">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ErrorModal;
