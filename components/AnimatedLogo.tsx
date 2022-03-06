import * as React from 'react';
import { View, Animated, Easing, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
let heightValue1 = new Animated.Value(0);
let heightValue2 = new Animated.Value(0);
let heightValue3 = new Animated.Value(0);

export function AnimatedLogo({ loading = true, size = 1 }) {
    Animated.sequence([
        Animated.delay(0),
        Animated.loop(Animated.timing(heightValue1, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    Animated.sequence([
        Animated.delay(100),
        Animated.loop(Animated.timing(heightValue2, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    Animated.sequence([
        Animated.delay(200),
        Animated.loop(Animated.timing(heightValue3, { toValue: 1, duration: 700, easing: Easing.ease, useNativeDriver: false }))
    ]).start();
    const height1 = !loading ? 4 * size : heightValue1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 13 * size, 0] });
    const height2 = !loading ? 7 * size : heightValue2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 13 * size, 0] });
    const height3 = !loading ? 13 * size : heightValue3.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 13 * size, 0] });
    const { colors } = useTheme();
    return (
        <View style={{ width: 28 * size, height: 28 * size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1, borderRadius: 5 * size, marginLeft: size !== 1 ? 5 : 15, marginRight: 5, padding: 2 * size, paddingLeft: 2 * size, paddingRight: 2 * size }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%' }}>
                <Animated.View style={{ borderRadius: 10 * size, height: height1, width: 2 * size, backgroundColor: colors.text }} />
                <Animated.View style={{ borderRadius: 10 * size, height: height2, width: 2 * size, backgroundColor: colors.text }} />
                <Animated.View style={{ borderRadius: 10 * size, height: height3, width: 2 * size, backgroundColor: colors.text }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', width: '100%', paddingTop: 2 * size, paddingBottom: 2 * size }}>
                <Animated.View style={{ borderRadius: 10 * size, height: 2 * size, width: 2 * size, backgroundColor: colors.text }} />
                <Animated.View style={{ borderRadius: 10 * size, height: 2 * size, width: 2 * size, backgroundColor: colors.text }} />
                <Animated.View style={{ borderRadius: 10 * size, height: 2 * size, width: 2 * size, backgroundColor: colors.text }} />
            </View>
        </View>
    );
}