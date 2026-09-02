import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { cn } from '../utils/cn';

export interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerClassName?: string;
}

export default function CustomInput({
  label,
  error,
  containerClassName,
  className,
  editable = true,
  ...props
}: CustomInputProps & { className?: string }) {
  return (
    <View className={cn('mb-3', containerClassName)}>
      {label ? <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">{label}</Text> : null}
      <TextInput
        className={cn(
          'border-[1.5px] border-gray-300 dark:border-zinc-700 rounded-[10px] px-3.5 py-3 text-[15px] text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900',
          error && 'border-red-500 dark:border-red-500',
          !editable && 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500',
          className
        )}
        placeholderTextColor="#9CA3AF"
        editable={editable}
        {...props}
      />
      {error ? <Text className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</Text> : null}
    </View>
  );
}
