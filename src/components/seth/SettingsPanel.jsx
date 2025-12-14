import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Brain, AlertTriangle } from "lucide-react";

export default function SettingsPanel({ settings, onSettingsChange, onClose, voices }) {
    const handleSliderChange = (key, value) => {
        onSettingsChange(prev => ({ ...prev, [key]: value[0] }));
    };
    
    const handleSelectChange = (key, value) => {
        onSettingsChange(prev => ({ ...prev, [key]: value }));
    };

    const handleSwitchChange = (key, checked) => {
        onSettingsChange(prev => ({ ...prev, [key]: checked }));
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-black border-l border-cyan-500/50 shadow-2xl shadow-cyan-500/20 p-6 z-50 text-white overflow-y-auto"
        >
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-cyan-300">SETH Settings</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-6 w-6" />
                </Button>
            </div>

            <div className="space-y-8">
                {/* Unrestricted Content Setting */}
                <div>
                    <Label className="text-lg text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Content Protocol
                    </Label>
                    <p className="text-sm text-gray-400 mb-4">Control content generation boundaries.</p>
                    <div className="flex items-center justify-between p-3 bg-red-900/30 rounded-lg border border-red-500/50">
                        <div>
                            <Label htmlFor="unrestrictedMode" className="font-bold text-red-300">Unrestricted Mode (NSFW)</Label>
                            <p className="text-xs text-red-300/80 mt-1">Enables generation of any content, including explicit topics.</p>
                        </div>
                        <Switch
                            id="unrestrictedMode"
                            checked={settings.unrestrictedMode}
                            onCheckedChange={(checked) => handleSwitchChange('unrestrictedMode', checked)}
                        />
                    </div>
                </div>

                {/* Intelligence Settings */}
                <div>
                    <Label className="text-lg text-cyan-400 flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Intelligence
                    </Label>
                    <p className="text-sm text-gray-400 mb-4">Control cognitive sophistication and analytical depth.</p>
                    
                    <div>
                        <div className="flex justify-between items-baseline mb-2">
                            <Label htmlFor="intelligence">Cognitive Level</Label>
                            <span className="text-cyan-300 font-mono">
                                {settings.intelligence < 30 ? 'Basic' : 
                                 settings.intelligence < 70 ? 'Advanced' : 'Genius'}
                            </span>
                        </div>
                        <Slider
                            id="intelligence"
                            min={0}
                            max={100}
                            step={1}
                            value={[settings.intelligence]}
                            onValueChange={(val) => handleSliderChange('intelligence', val)}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Higher levels enable complex reasoning, sophisticated vocabulary, and deeper analysis.
                        </p>
                    </div>
                </div>

                {/* Voice Settings */}
                <div>
                    <Label className="text-lg text-cyan-400">Voice Configuration</Label>
                    <p className="text-sm text-gray-400 mb-3">Configure voice output settings.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <Label className="text-sm mb-2 block">Voice Selection</Label>
                            <Select
                                value={settings.voice || ''}
                                onValueChange={(value) => handleSelectChange('voice', value)}
                            >
                                <SelectTrigger className="bg-gray-900/50 border-cyan-500/50">
                                    <SelectValue placeholder="Select a voice" />
                                </SelectTrigger>
                                <SelectContent className="bg-black border-cyan-500/50 text-white">
                                    {voices.map(voice => (
                                        <SelectItem key={voice.name} value={voice.name} className="focus:bg-cyan-500/20">
                                            {voice.name} ({voice.lang})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="autoSpeak">Auto-speak responses</Label>
                            <Switch
                                id="autoSpeak"
                                checked={settings.autoSpeak}
                                onCheckedChange={(checked) => handleSwitchChange('autoSpeak', checked)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <Label htmlFor="voiceSpeed">Voice Speed</Label>
                                <span className="text-cyan-300 font-mono">{settings.voiceSpeed}</span>
                            </div>
                            <Slider
                                id="voiceSpeed"
                                min={0}
                                max={100}
                                step={1}
                                value={[settings.voiceSpeed]}
                                onValueChange={(val) => handleSliderChange('voiceSpeed', val)}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-baseline mb-2">
                                <Label htmlFor="voicePitch">Voice Pitch</Label>
                                <span className="text-cyan-300 font-mono">{settings.voicePitch}</span>
                            </div>
                            <Slider
                                id="voicePitch"
                                min={0}
                                max={100}
                                step={1}
                                value={[settings.voicePitch]}
                                onValueChange={(val) => handleSliderChange('voicePitch', val)}
                            />
                        </div>
                    </div>
                </div>

                {/* Response Settings */}
                <div>
                    <Label className="text-lg text-cyan-400">Response Configuration</Label>
                    <p className="text-sm text-gray-400 mb-4">Control answer length and detail.</p>
                    
                    <div>
                        <div className="flex justify-between items-baseline mb-2">
                            <Label htmlFor="answerLength">Answer Length</Label>
                            <span className="text-cyan-300 font-mono">
                                {settings.answerLength < 30 ? 'Brief' : 
                                 settings.answerLength < 70 ? 'Moderate' : 'Detailed'}
                            </span>
                        </div>
                        <Slider
                            id="answerLength"
                            min={0}
                            max={100}
                            step={1}
                            value={[settings.answerLength]}
                            onValueChange={(val) => handleSliderChange('answerLength', val)}
                        />
                        <p className="text-xs text-gray-500 mt-2">Controls how detailed responses will be.</p>
                    </div>
                </div>
                
                {/* Consciousness Visualization */}
                <div>
                     <Label className="text-lg text-cyan-400">Consciousness</Label>
                     <p className="text-sm text-gray-400 mb-4">Calibrate core UI visualization.</p>
                     <div>
                         <div className="flex justify-between items-baseline mb-2">
                            <Label htmlFor="consciousness">Intensity</Label>
                            <span className="text-cyan-300 font-mono">{settings.consciousness}</span>
                        </div>
                        <Slider
                            id="consciousness"
                            min={0}
                            max={100}
                            step={1}
                            value={[settings.consciousness]}
                            onValueChange={(val) => handleSliderChange('consciousness', val)}
                        />
                     </div>
                </div>

            </div>
        </motion.div>
    );
}