import React from 'react';
import { Text, TouchableOpacity, View, ScrollView, useWindowDimensions, Platform, Image } from 'react-native';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen({ route, navigation, setTheme, theme }: any) {
    const windowDimensions = useWindowDimensions();
    const scrollRef = React.useRef(null);
    const { colors } = useTheme();
    const [index, setIndex] = React.useState(0);
    const [animateLogo, setAnimateLogo] = React.useState(true);

    React.useEffect(() => { setTimeout(() => { setAnimateLogo(false) }, 1400) }, [])

    return (
        <View style={{ flex: 1, height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <ScrollView
                ref={scrollRef}
                onMomentumScrollEnd={({ nativeEvent }: any) => {
                    const position = nativeEvent.contentOffset;
                    const currentIndex = Math.round(nativeEvent.contentOffset.x / windowDimensions.width);

                    if (index !== currentIndex) {
                        setIndex(currentIndex);
                        setAnimateLogo(false);
                    }
                }}
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                pagingEnabled={true}
                horizontal={true}
                style={{ width: windowDimensions.width, height: '100%', alignSelf: 'center' }}
                contentContainerStyle={{ display: 'flex', alignItems: 'flex-start', width: windowDimensions.width * 3 }}
                automaticallyAdjustContentInsets={false}
                directionalLockEnabled={true}
                decelerationRate={0.999999}
            >
                <View style={{ flex: 1, height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minWidth: windowDimensions.width }}>
                    <View style={{ padding: 40, height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity onPress={() => { setAnimateLogo(true); setTimeout(() => { setAnimateLogo(false) }, 1400) }}><AnimatedLogo loading={animateLogo} size={3} /></TouchableOpacity>
                        <Text style={{ color: colors.text, fontSize: 30, marginTop: 20, textAlign: 'center', marginBottom: 10 }}>welcome to productabot!</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center' }}>we're trying to create a <Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> minimalist </Text> project management app.</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', marginTop: 20 }}>no over-baked features, no confusing tools- just a simple framework for productivity.</Text>
                        <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ marginTop: 60, marginBottom: -60 }} onPress={() => { scrollRef.current.scrollTo({ x: windowDimensions.width, y: 0, animated: true }) }}>
                            <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', textDecorationLine: 'underline' }}>how it works →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ flex: 1, height: '100%', width: '100%', alignItems: 'center', justifyContent: 'flex-start', minWidth: windowDimensions.width }}>
                    <View style={{ padding: 40, height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: '100%' }}>
                            <AnimatedLogo loading={false} size={0.75} /><Text style={{ color: colors.text, fontSize: 20, textAlign: 'left' }}>productabot works with 4 different tabs</Text></View>
                        {/* <Text style={{ color: colors.text, fontSize: 18, textAlign: 'left', marginBottom: 20 }}>⧉ projects   ▦ calendar  ☉ tasks   ≡ notes</Text> */}
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'left', marginBottom: 20 }}><Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> ⧉ projects </Text> give each of your ideas a tangible home. you can upload files, create docs, log your hours, manage tasks, and add events.</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'left', marginBottom: 20 }}><Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> ⧉ calendar </Text> shows an overview of the hours you spend on each project, tasks that are assigned a due date, and any events you might add.</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'left', marginBottom: 20 }}><Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> ☉ tasks </Text> organize your todos for each project. it's a kanban board with 4 columns: backlog, selected, in progress, and todo. you can manage tasks across multiple projects at the same time.</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'left', marginBottom: 20 }}><Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> ≡ notes </Text> can be used to keep track of your day, create a personal wiki, or record anything else you'd like. all notes are end-to-end encrypted and safely synced across your devices.</Text>
                        <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ marginTop: 0 }} onPress={() => { scrollRef.current.scrollTo({ x: windowDimensions.width * 2, y: 0, animated: true }) }}>
                            <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', textDecorationLine: 'underline' }}>keep going →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ flex: 1, height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minWidth: windowDimensions.width }}>
                    <View style={{ padding: 40, height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', marginBottom: 20 }}>the <Text style={{ color: '#ffffff', backgroundColor: '#3F0054' }}> productabot philosophy </Text> is to stay out of the way and let you organize the time you spend on each project.</Text>
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', marginBottom: 0 }}>it's easier than you might think.</Text>
                        <Image style={{ height: 250, width: 250, tintColor: colors.text }} source={require('../assets/images/premium.png')} />
                        <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', marginBottom: 5 }}>ready to dive in?</Text>
                        <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ marginTop: 0 }} onPress={() => { navigation.push('signup') }}>
                            <Text style={{ color: colors.text, fontSize: 20, textAlign: 'center', textDecorationLine: 'underline' }}>get started →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
            <TouchableOpacity style={{ borderColor: colors.placeholder, borderRadius: 5, borderWidth: 1, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 25, paddingTop: 0, paddingBottom: 0, paddingLeft: 10, paddingRight: 10 }} onPress={async (e) => {
                e.preventDefault();
                let currentTheme = await AsyncStorage.getItem('theme');
                let nextTheme = 'dark';
                if (!currentTheme || currentTheme === 'dark') {
                    nextTheme = 'light';
                }
                await AsyncStorage.setItem('theme', nextTheme);
                setTheme(nextTheme);
            }} >
                <Text style={{ color: colors.text, fontSize: Platform.OS === 'web' ? 13 : 15 }}>{theme === 'dark' ? 'turn on the lights ☀' : 'turn off the lights ◗*'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
                {[0, 1, 2].map(obj => <Text key={obj} style={{ color: index === obj ? colors.text : colors.text + '33', fontSize: 60 }}>•</Text>)}
            </View>
            <TouchableOpacity style={{ padding: 10, width: windowDimensions.width - 50, backgroundColor: '#3F0054', borderRadius: 10, marginBottom: 10 }} onPress={() => { navigation.push('signup') }}>
                <Text style={{ color: '#ffffff', fontSize: 30, textAlign: 'center' }}>get started</Text></TouchableOpacity>
            <TouchableOpacity style={{ padding: 10, width: windowDimensions.width - 50, backgroundColor: '#3F91A1', borderRadius: 10, marginBottom: 10 }} onPress={() => { navigation.push('login') }}>
                <Text style={{ color: '#ffffff', fontSize: 20, textAlign: 'center' }}>login with existing account</Text></TouchableOpacity>
        </View>
    );
}
