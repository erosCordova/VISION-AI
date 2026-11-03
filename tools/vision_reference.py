"""Referencia matemática de Fase 2; no realiza inferencia ni decodifica imágenes."""
from dataclasses import dataclass
import math

EPSILON = 1e-9


def number(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{name} debe ser un número finito')
    return float(value)


def unit(value, name):
    value = number(value, name)
    if not 0 <= value <= 1:
        raise ValueError(f'{name} debe estar entre 0 y 1')
    return value


def dimension(value, name):
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f'{name} debe ser un entero positivo')
    return value


@dataclass(frozen=True)
class Box:
    x: float
    y: float
    width: float
    height: float

    def __post_init__(self):
        for name in ('x', 'y', 'width', 'height'):
            unit(getattr(self, name), name)
        if self.width <= 0 or self.height <= 0:
            raise ValueError('Ancho y alto deben ser positivos')
        if self.x + self.width > 1 + EPSILON or self.y + self.height > 1 + EPSILON:
            raise ValueError('La caja excede los límites de la imagen')

    @property
    def area(self):
        return self.width * self.height


def box_iou(first, second):
    width = max(0.0, min(first.x + first.width, second.x + second.width) - max(first.x, second.x))
    height = max(0.0, min(first.y + first.height, second.y + second.height) - max(first.y, second.y))
    intersection = width * height
    return intersection / (first.area + second.area - intersection)


def viewport_box(box, image_width, image_height, viewport_width, viewport_height):
    """object-fit contain centrado; devuelve x, y, ancho y alto en píxeles CSS."""
    for name, value in [('image_width', image_width), ('image_height', image_height),
                        ('viewport_width', viewport_width), ('viewport_height', viewport_height)]:
        dimension(value, name)
    scale = min(viewport_width / image_width, viewport_height / image_height)
    width, height = image_width * scale, image_height * scale
    left, top = (viewport_width - width) / 2, (viewport_height - height) / 2
    return (left + box.x * width, top + box.y * height, box.width * width, box.height * height)


@dataclass(frozen=True)
class Letterbox:
    image_width: int
    image_height: int
    target_width: int
    target_height: int
    resized_width: int
    resized_height: int
    pad_left: int
    pad_top: int

    def __post_init__(self):
        for name in ('image_width', 'image_height', 'target_width', 'target_height',
                     'resized_width', 'resized_height'):
            dimension(getattr(self, name), name)
        for name in ('pad_left', 'pad_top'):
            value = getattr(self, name)
            if isinstance(value, bool) or not isinstance(value, int) or value < 0:
                raise ValueError('El relleno debe ser un entero no negativo')
        if self.pad_left + self.resized_width > self.target_width or self.pad_top + self.resized_height > self.target_height:
            raise ValueError('La región redimensionada excede el lienzo de entrada')

    def forward(self, box):
        return Box((self.pad_left + box.x * self.resized_width) / self.target_width,
                   (self.pad_top + box.y * self.resized_height) / self.target_height,
                   box.width * self.resized_width / self.target_width,
                   box.height * self.resized_height / self.target_height)

    def inverse(self, box):
        return Box((box.x * self.target_width - self.pad_left) / self.resized_width,
                   (box.y * self.target_height - self.pad_top) / self.resized_height,
                   box.width * self.target_width / self.resized_width,
                   box.height * self.target_height / self.resized_height)


def rotate_box(box, clockwise_degrees):
    """Giros geométricos; no sustituye la lectura EXIF del decodificador."""
    if isinstance(clockwise_degrees, bool) or clockwise_degrees not in (0, 90, 180, 270):
        raise ValueError('Solo se admiten giros 0, 90, 180 o 270')
    if clockwise_degrees == 0:
        return box
    if clockwise_degrees == 90:
        return Box(max(0.0, 1 - box.y - box.height), box.x, box.height, box.width)
    if clockwise_degrees == 180:
        return Box(max(0.0, 1 - box.x - box.width), max(0.0, 1 - box.y - box.height), box.width, box.height)
    return Box(box.y, max(0.0, 1 - box.x - box.width), box.height, box.width)


def validate_mask(mask):
    if not isinstance(mask, (list, tuple)) or not mask:
        raise ValueError('La máscara debe tener filas')
    if not isinstance(mask[0], (list, tuple)) or not mask[0]:
        raise ValueError('La máscara debe tener columnas')
    width = len(mask[0])
    for row in mask:
        if not isinstance(row, (list, tuple)) or len(row) != width:
            raise ValueError('La máscara debe ser rectangular')
        if any(type(value) is not int or value not in (0, 1) for value in row):
            raise ValueError('La máscara binaria solo admite enteros 0 y 1')
    return width, len(mask)


def mask_area_ratio(mask):
    width, height = validate_mask(mask)
    return sum(sum(row) for row in mask) / (width * height)


def mask_metrics(first, second):
    """Ambas vacías: None, sin evidencia positiva; no se convierten en un acierto."""
    if validate_mask(first) != validate_mask(second):
        raise ValueError('Las máscaras deben tener iguales dimensiones')
    a = [value for row in first for value in row]
    b = [value for row in second for value in row]
    intersection = sum(x & y for x, y in zip(a, b))
    union = sum(x | y for x, y in zip(a, b))
    foreground = sum(a) + sum(b)
    return {'iou': intersection / union if union else None,
            'dice': 2 * intersection / foreground if foreground else None}


def rle_encode(mask):
    """RLE propio row-major, inicia con longitud de ceros; no es COCO RLE."""
    width, height = validate_mask(mask)
    counts, current, length = [], 0, 0
    for value in (value for row in mask for value in row):
        if value == current:
            length += 1
        else:
            counts.append(length)
            current, length = value, 1
    counts.append(length)
    return {'encoding': 'binary-rle-row-v1', 'width': width, 'height': height, 'counts': counts}


def rle_decode(data, max_pixels=20_000_000):
    if not isinstance(data, dict) or data.get('encoding') != 'binary-rle-row-v1':
        raise ValueError('Codificación RLE no admitida')
    dimension(max_pixels, 'max_pixels')
    width, height = dimension(data.get('width'), 'width'), dimension(data.get('height'), 'height')
    if width * height > max_pixels:
        raise ValueError('La máscara excede el presupuesto de píxeles')
    counts = data.get('counts')
    if not isinstance(counts, list) or not counts:
        raise ValueError('Faltan longitudes RLE')
    if any(type(value) is not int or value < 0 or (i > 0 and value == 0) for i, value in enumerate(counts)):
        raise ValueError('Longitudes RLE inválidas')
    if sum(counts) != width * height:
        raise ValueError('Las longitudes no coinciden con las dimensiones')
    flat = [bit for i, count in enumerate(counts) for bit in [i % 2] * count]
    return [flat[i:i + width] for i in range(0, len(flat), width)]


def filter_detections(detections, threshold):
    """Devuelve otra lista; no elimina ni modifica el resultado bruto."""
    threshold = unit(threshold, 'threshold')
    for detection in detections:
        unit(detection['confidence'], 'confidence')
    return [detection for detection in detections if detection['confidence'] >= threshold]
