Pod::Spec.new do |s|
  s.name           = 'SubjectLift'
  s.version        = '1.0.0'
  s.summary        = 'On-device product cut-out for the BirKare Studio live preview'
  s.description    = 'Separates the product in a photo from its background with the Vision framework.'
  s.author         = 'BirKare'
  s.homepage       = 'https://birkare.ai'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift}'
end
