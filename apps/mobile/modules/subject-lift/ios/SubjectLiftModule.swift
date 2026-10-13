import CoreImage
import ExpoModulesCore
import UIKit
import Vision

/// Separates the main subject of a photo from its background on the device.
/// Used only for the studio's live preview; the photo never leaves the phone here.
public class SubjectLiftModule: Module {
  private static let filePrefix = "birkare-cutout-"
  /// Enough for an on-screen preview and keeps the request fast on older phones.
  private static let maxSide: CGFloat = 1536

  public func definition() -> ModuleDefinition {
    Name("BirKareSubjectLift")

    AsyncFunction("liftSubject") { (uri: String) -> String? in
      guard #available(iOS 17.0, *) else { return nil }
      guard let url = URL(string: uri),
            let data = try? Data(contentsOf: url),
            let source = UIImage(data: data),
            let image = Self.normalized(source) else { return nil }

      let request = VNGenerateForegroundInstanceMaskRequest()
      let handler = VNImageRequestHandler(cgImage: image, options: [:])
      try handler.perform([request])
      guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
        return nil
      }
      let masked = try observation.generateMaskedImage(
        ofInstances: observation.allInstances,
        from: handler,
        croppedToInstancesExtent: true
      )
      let rendered = CIImage(cvPixelBuffer: masked)
      guard let cutout = CIContext().createCGImage(rendered, from: rendered.extent),
            let png = UIImage(cgImage: cutout).pngData() else { return nil }

      let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      Self.removePreviousCutouts(in: directory)
      let file = directory.appendingPathComponent("\(Self.filePrefix)\(UUID().uuidString).png")
      try png.write(to: file, options: .atomic)
      return file.absoluteString
    }
  }

  /// Applies the EXIF orientation and bounds the size before Vision sees the pixels.
  private static func normalized(_ image: UIImage) -> CGImage? {
    let longest = max(image.size.width, image.size.height)
    guard longest > 0 else { return nil }
    let scale = min(1, maxSide / longest)
    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }.cgImage
  }

  /// Only one preview cut-out is ever in use, so older ones are removed.
  private static func removePreviousCutouts(in directory: URL) {
    let files = (try? FileManager.default.contentsOfDirectory(
      at: directory, includingPropertiesForKeys: nil)) ?? []
    for file in files where file.lastPathComponent.hasPrefix(filePrefix) {
      try? FileManager.default.removeItem(at: file)
    }
  }
}
