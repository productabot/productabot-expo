import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Auth } from "@aws-amplify/auth";
import LogoSvg from "../svgs/logo";
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import { useTheme } from '@react-navigation/native';
import { AnimatedLogo } from '../components/AnimatedLogo';
import * as root from '../Root';

export default function ResetScreen({ route, navigation, setLoading, loading }: any) {
    const [state, setState] = useState({
        email: '', errorMessage: ''
    });
    const { colors } = useTheme();
    const styles = makeStyles(colors);
    const reset = async () => {
        Keyboard.dismiss();
        if (state.email.length === 0) {
            setState({ ...state, errorMessage: 'Please enter an email address' });
        }
        else {
            setLoading(true);
            try {
                let response = await Auth.forgotPassword(state.email);
                console.log(response);
                setLoading(false);
                navigation.push('login', { reset: true });
            }
            catch (err) {
                console.log(err);
                setLoading(false);
                setState({ ...state, errorMessage: JSON.stringify(err.message) });
            }

        }
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
                keyboardVerticalOffset={-200}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <AnimatedLogo loading={loading} size={1.5} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
                </TouchableOpacity>
                <View style={{ margin: 30 }}>
                    {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                    <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='Email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address' onSubmitEditing={reset} />
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]} onPress={reset}>
                    <Text style={[styles.baseText, styles.buttonText]}>Send link to reset password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: 'transparent' }]}
                    onPress={() => { navigation.goBack() }}>
                    <Text style={[styles.baseText, styles.buttonText, { color: colors.text }]}>Go back</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </View>
    );
}
const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const makeStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: colors.text
    },
    touchableOpacity: {
        backgroundColor: '#3F0054',
        padding: s(10),
        width: 275,
        alignItems: 'center',
        margin: s(10),
        borderRadius: 10
    },
    buttonText: {
        fontSize: isWeb ? s(30) : 22,
        color: '#ffffff'
    },
    textInput: {
        fontSize: isWeb ? s(30) : 22,
        width: 275,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        color: colors.text,
        margin: s(10)
    },
});