import React from 'react';
import { View, Text } from 'react-native';
import { FileCategory } from '../types';

interface StatusBadgeProps {
  status: 'Success' | 'Pending' | 'Error';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    Success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Pending: 'bg-amber-50 text-amber-700 border-amber-100',
    Error: 'bg-red-50 text-red-700 border-red-100',
  }[status];

  const dotColor = {
    Success: 'bg-emerald-500',
    Pending: 'bg-amber-500',
    Error: 'bg-red-500',
  }[status];

  return (
    <View className={`flex-row items-center px-2 py-0.5 rounded-md border ${styles}`}>
      <View className={`w-1 h-1 rounded-full mr-1.5 ${dotColor}`} />
      <Text className={`text-[9px] font-bold uppercase tracking-tight ${styles.split(' ')[1]}`}>
        {status}
      </Text>
    </View>
  );
}

interface CategoryBadgeProps {
  category: FileCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const styles = {
    [FileCategory.Finance]: 'bg-slate-50 text-slate-700 border-slate-200',
    [FileCategory.Legal]: 'bg-slate-50 text-slate-700 border-slate-200',
    [FileCategory.Work]: 'bg-slate-50 text-slate-700 border-slate-200',
    [FileCategory.Personal]: 'bg-slate-50 text-slate-700 border-slate-200',
  }[category];

  return (
    <View className={`px-2 py-0.5 rounded-md border ${styles}`}>
      <Text className={`text-[9px] font-bold uppercase tracking-tight ${styles.split(' ')[1]}`}>
        {category}
      </Text>
    </View>
  );
}
