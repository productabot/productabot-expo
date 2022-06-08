import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Keyboard, useWindowDimensions, Text, Image } from 'react-native';
import { View } from '../components/Themed';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';

export default function TimelinesScreen({ route, navigation, setLoading }: any) {
    const { colors } = useTheme();
    return (
        <View style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start'
        }}>
            <View style={{ height: 100 }} />
        </View >
    );
}