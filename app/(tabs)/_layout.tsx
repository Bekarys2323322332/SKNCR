import { images } from "@/components/images";
import { Tabs } from "expo-router";
import { Image, View } from "react-native";



function TabIcon({ focused, title, icon }: any) {
    if (focused) {
        return (
        
                
                 <View className="size-full justify-center items-center mt-4 rounded-full">
          <Image source={icon} tintColor="#5878d5ff" className="w-7 h-7" resizeMode="contain"/>
            </View>
        );
    }

    return (
        <View className="size-full justify-center items-center mt-4 rounded-full">
          <Image source={icon} tintColor="#A8B5DB" className="w-6 h-6" resizeMode="contain"/>
        </View>
    );
}
export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarShowLabel: false,
                tabBarItemStyle: {
                    width: "100%",
                    height: "100%",
                    justifyContent: "center",
                    alignItems: "center",
                    borderColor: "#E5E5E5",
                },
                
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "index",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused}  icon={images.water} title="Home" />
                    ),
                }}
            />

        <Tabs.Screen
            name="scanbar"
            options={{
                title: "scanbar",
                headerShown: false,
                tabBarIcon: ({ focused }) => (
                    <TabIcon focused={focused} icon={images.scan} title="scanbar" />
                ),
            }}
        />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        <TabIcon focused={focused} icon={images.profile} title="Profile" />
                    ),
                }}
            />



        </Tabs>
    );
}