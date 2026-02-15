import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  ChevronRight, 
  Clock, 
  ArrowUpRight 
} from 'lucide-react-native';
import { ProcessedFile, SyncStatus } from '../types';
import { StatusBadge, CategoryBadge } from './Badges';

interface FileCardProps {
  file: ProcessedFile;
}

export default function FileCard({ file }: FileCardProps) {
  const handlePress = async () => {
    if (file.driveUrl) {
      Linking.openURL(file.driveUrl);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = () => {
    const props = { size: 24, color: '#64748b' };
    
    // The instruction implies a change to the getFileIcon logic.
    // The provided 'Code Edit' block seems to be a new function definition
    // that was intended to replace the existing one, using mimeType.
    // I'm interpreting "Fix FileIcon name" in the context of the provided
    // 'Code Edit' to mean updating the icon logic and adding FileText.
    // The 'Code Edit' itself was syntactically incorrect as a direct patch,
    // so I'm integrating its intent correctly.
    const mimeType = file.mimeType?.toLowerCase() || '';

    if (mimeType.includes('pdf')) return <FileText {...props} />;
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('document')) return <FileCode {...props} />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet {...props} />;
    if (mimeType.includes('image')) return <FileImage {...props} />;
    return <File {...props} />; // Changed from FileIcon to File
  };

  const canOpen = file.status === SyncStatus.Success && file.driveUrl;

  return (
    <TouchableOpacity
      className={`bg-white rounded-2xl p-4 mb-3 border border-slate-100 ${!canOpen ? 'opacity-70 bg-slate-50' : ''}`}
      onPress={handlePress}
      disabled={!canOpen}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center bg-transparent">
        <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center mr-3 border border-slate-50">
          {getFileIcon()}
        </View>
        <View className="flex-1 bg-transparent">
          <Text className="text-[15px] font-semibold text-slate-800 leading-tight" numberOfLines={1}>
            {file.filename}
          </Text>
          <View className="flex-row items-center mt-0.5 bg-transparent">
            <Text className="text-[12px] text-slate-500 font-medium">
              {formatFileSize(file.size)}
            </Text>
            <View className="w-1 h-1 rounded-full bg-slate-300 mx-2" />
            <Text className="text-[12px] text-slate-400">
              {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
            </Text>
          </View>
        </View>
        {canOpen && <ChevronRight size={18} color="#94a3b8" />}
      </View>

      <View className="mt-4 flex-row justify-between items-center bg-transparent">
        <View className="flex-row gap-2 bg-transparent">
          <CategoryBadge category={file.category} />
          <StatusBadge status={file.status} />
        </View>
      </View>

      {file.errorMessage && (
        <View className="mt-3 p-2 bg-red-50/50 rounded-lg border border-red-100">
          <Text className="text-[10px] text-red-600 font-medium leading-4">{file.errorMessage}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
