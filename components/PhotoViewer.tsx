// PhotoViewer.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from 'date-fns';
import React from 'react';
import { Dimensions, Image, Modal, Text, TouchableOpacity, View } from 'react-native';

interface PhotoViewerProps {
  visible: boolean;
  onClose: () => void;
  viewerDate: Date;
  getPhotoForDate: (date: Date, type?: "single" | "morning" | "evening") => string | undefined;
  onNavigate: (direction: "prev" | "next") => void;
  canNavigate: (direction: "prev" | "next") => boolean;
}


const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  onClose,
  viewerDate,
  getPhotoForDate,
  onNavigate,
  canNavigate,
}) => {
  const morningPhoto = getPhotoForDate(viewerDate, 'morning');
  const eveningPhoto = getPhotoForDate(viewerDate, 'evening');
  const singlePhoto = getPhotoForDate(viewerDate, 'single');
  const hasPhotos = morningPhoto || eveningPhoto || singlePhoto;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {/* Header */}
        <View style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          zIndex: 10
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            {format(viewerDate, 'MMMM d, yyyy')}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          {hasPhotos ? (
          <View style={{ width: '100%' }}>

            {/* 1. Morning photo (hard mode) */}
            {morningPhoto && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                  Morning Check-in
                </Text>
                <Image
                  source={{ uri: morningPhoto }}
                  style={{
                    width: Dimensions.get('window').width - 40,
                    height: (Dimensions.get('window').width - 40) * 0.75,
                    borderRadius: 12
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* 2. Evening photo (hard mode) */}
            {eveningPhoto && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                  Evening Check-in
                </Text>
                <Image
                  source={{ uri: eveningPhoto }}
                  style={{
                    width: Dimensions.get('window').width - 40,
                    height: (Dimensions.get('window').width - 40) * 0.75,
                    borderRadius: 12
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* 3. Easy mode fallback */}
            {singlePhoto && !morningPhoto && !eveningPhoto && (
              <View style={{ marginBottom: 20 }}>
                <Image
                  source={{ uri: singlePhoto }}
                  style={{
                    width: Dimensions.get('window').width - 40,
                    height: (Dimensions.get('window').width - 40) * 0.75,
                    borderRadius: 12
                  }}
                  resizeMode="cover"
                />
              </View>
            )}

          </View>
        ) : (
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
            No photos available on this device.
          </Text>
        )}
        </View>

        {/* Navigation */}
        <View style={{
          position: 'absolute',
          bottom: 50,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 20
        }}>
          <TouchableOpacity
            onPress={() => onNavigate('prev')}
            disabled={!canNavigate('prev')}
            style={{
              padding: 16,
              backgroundColor: canNavigate('prev') ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.2)',
              borderRadius: 50
            }}
          >
            <Ionicons name="chevron-back" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('next')}
            disabled={!canNavigate('next')}
            style={{
              padding: 16,
              backgroundColor: canNavigate('next') ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.2)',
              borderRadius: 50
            }}
          >
            <Ionicons name="chevron-forward" size={32} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PhotoViewer;
