Pod::Spec.new do |s|
  s.name           = 'TaiyabahLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Starts and ends the next-jamāʿah Live Activity.'
  s.description    = 'A thin wrapper over ActivityKit. No push, no server: the activity is started on the device and ticks itself.'
  s.author         = 'Yameen Bux'
  s.homepage       = 'https://taiyabahmasjid.org'
  s.license        = { :type => 'Proprietary' }
  # MUST NOT exceed the app's own deployment target. Expo SDK 52 defaults to
  # iOS 15.1 and nothing in app.json raises it, so declaring 16.2 here made
  # CocoaPods refuse the whole install: "The platform of the target ... is not
  # compatible with TaiyabahLiveActivity which has a minimum requirement of
  # iOS 16.2". Everything that actually needs 16.2 is guarded in the Swift.
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
